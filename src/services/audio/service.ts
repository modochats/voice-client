import {EventEmitter} from "../emitter/event-emitter";
import {AudioInputProcessor} from "./input-processor";
import {AudioConfig} from "../shared/types/config";
import {RecordingState, AudioDeviceInfo} from "./audio";
import {EventType} from "../shared/types/events";
import {AudioOutputProcessor} from "./output-processor";
export class AudioService {
  private eventEmitter: EventEmitter;
  private inputProcessor: AudioInputProcessor;
  private config: AudioConfig;
  private sendAudioToServer: ((data: string) => void) | null = null;
  volume: number = 0;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private micResumeTimeout: NodeJS.Timeout | null = null;
  private micPaused: boolean = false;

  outputProcessor: AudioOutputProcessor;

  constructor(eventEmitter: EventEmitter, config: AudioConfig) {
    this.eventEmitter = eventEmitter;
    this.inputProcessor = new AudioInputProcessor(config, this.eventEmitter);
    this.config = config;
    this.outputProcessor = new AudioOutputProcessor();
  }

  setSendAudioCallback(callback: (data: string) => void): void {
    this.sendAudioToServer = callback;
  }

  async initialize(deviceId?: string): Promise<void> {
    try {
      // Get the stream FIRST to determine actual sample rate
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? {exact: deviceId} : undefined,
          ...this.config.constraints
        }
      });

      this.mediaStream = stream;

      this.audioContext = new AudioContext({sampleRate: this.config.constraints.sampleRate});
      await this.audioContext.audioWorklet.addModule("https://moderndata.s3.ir-thr-at1.arvanstorage.ir/audio.js");
      let microphone = this.audioContext.createMediaStreamSource(this.mediaStream);

      const node = new AudioWorkletNode(this.audioContext, "vumeter");
      node.port.onmessage = event => {
        let _volume = 0;
        let _sensibility = 5;
        if (event.data.volume) _volume = event.data.volume;
        this.volume = Math.round((_volume * 100) / _sensibility);
      };
      microphone.connect(node).connect(this.audioContext.destination);

      this.audioContext.resume();

      try {
        this.outputProcessor.init({
          audioContext: this.audioContext,
          mediaStream: this.mediaStream,
          tempChunkCreateCallback: data => {
            if (this.micPaused) return;
            this.sendAudioToServer?.(data);
          },
          getVolume: () => this.volume
        });
      } catch (err) {
        console.error("Generator: Error starting recording:", err);
      }

      this.inputProcessor.setRecordingState(RecordingState.RECORDING);
    } catch (error) {
      await this.eventEmitter.emit({
        type: EventType.ERROR,
        timestamp: Date.now(),
        error: error as Error,
        message: `Failed to initialize audio: ${(error as Error).message}`
      });
      throw error;
    }
  }

  async handleIncomingAudioChunk(unit8Array: Uint8Array): Promise<void> {
    this.inputProcessor.handleIncomingAudioChunk(unit8Array);
  }

  async pauseMicrophone(): Promise<void> {
    this.micPaused = true;
    this.mediaStream?.getAudioTracks().forEach(track => (track.enabled = false));
  }

  async resumeMicrophone(): Promise<void> {
    this.micPaused = false;
    this.mediaStream?.getAudioTracks().forEach(track => (track.enabled = true));
  }

  async getAvailableDevices(): Promise<AudioDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter(device => device.kind === "audioinput")
      .map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
        kind: device.kind,
        groupId: device.groupId
      }));
  }

  async cleanup(): Promise<void> {
    if (this.micResumeTimeout) {
      clearTimeout(this.micResumeTimeout);
    }

    const currentElement = this.inputProcessor.getCurrentAudioElement();
    if (currentElement) {
      currentElement.pause();
      currentElement.src = "";
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.inputProcessor.reset();

    this.outputProcessor.reset();
  }
}
