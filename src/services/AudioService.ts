import {EventEmitter} from "./EventEmitter";
import {AudioState} from "../models/AudioState";
import {VoiceMetrics} from "../models/VoiceMetrics";
import {AudioConfig} from "../types/config";
import {AudioPlaybackState, RecordingState, AudioDeviceInfo, VoiceActivityMetrics} from "../types/audio";
import {EventType} from "../types/events";
import {createBlob} from "../utils/blob";
export class AudioService {
  private eventEmitter: EventEmitter;
  private audioState: AudioState;
  private voiceMetrics: VoiceMetrics;
  private config: AudioConfig;
  private sendAudioToServer: ((data: Uint8Array) => void) | null = null;
  volume: number = 0;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;

  private playbackRetryTimer: NodeJS.Timeout | null = null;
  private micResumeTimeout: NodeJS.Timeout | null = null;

  constructor(eventEmitter: EventEmitter, audioState: AudioState, voiceMetrics: VoiceMetrics, config: AudioConfig) {
    this.eventEmitter = eventEmitter;
    this.audioState = audioState;
    this.voiceMetrics = voiceMetrics;
    this.config = config;
  }

  setSendAudioCallback(callback: (data: Uint8Array) => void): void {
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

      // Create AudioContext WITHOUT specifying sample rate - let it use device's native rate
      // This ensures AudioContext sample rate matches the media stream
      this.audioContext = new AudioContext();
      await this.audioContext.audioWorklet.addModule(this.config.processorPath);
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
        const sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        sourceNode.connect(this.audioContext.createGain());

        const bufferSize = 256;
        const scriptProcessorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
        console.log("Script processor node created", sourceNode);
        scriptProcessorNode.onaudioprocess = audioProcessingEvent => {
          const inputBuffer = audioProcessingEvent.inputBuffer;
          const pcmData = inputBuffer.getChannelData(0);
          console.log(createBlob(pcmData).data);
          // @ts-ignore
          if (this.volume >= 2) this.sendAudioToServer(createBlob(pcmData).data);
        };
        sourceNode.connect(scriptProcessorNode);
        scriptProcessorNode.connect(this.audioContext.destination);
      } catch (err) {
        console.log(err);
      }

      // await this.setupAudioWorklet();

      this.audioState.setRecordingState(RecordingState.RECORDING);
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

  private async setupAudioWorklet(): Promise<void> {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error("Audio context or media stream not initialized");
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.audioWorkletNode = new AudioWorkletNode(this.audioContext, "audio-processor", {
      processorOptions: this.config.processor
    });
    this.audioWorkletNode.port.onmessage = event => {
      // Handle raw ArrayBuffer (audio data) or structured messages (metrics)
      if (event.data instanceof Uint8Array) {
        this.handleAudioData(event.data);
      } else {
        this.handleWorkletMessage(event.data);
      }
    };

    source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
  }

  private handleWorkletMessage(data: {
    type: string;
    audioData?: Uint8Array;
    rms?: number;
    db?: number;
    isActive?: boolean;
    isPaused?: boolean;
    noiseFloor?: number;
  }): void {
    switch (data.type) {
      case "audioData":
        if (data.audioData) {
          this.handleAudioData(data.audioData);
        }
        break;

      case "voice-level": // Match audio-processor.js format
      case "voiceLevel":
        if (data.rms !== undefined && data.db !== undefined) {
          const metrics: VoiceActivityMetrics = {
            rms: data.rms,
            db: data.db,
            isActive: data.isActive ?? false,
            isPaused: data.isPaused ?? false,
            noiseFloor: data.noiseFloor ?? 0,
            threshold: this.config.processor.voiceThreshold
          };

          this.voiceMetrics.update(metrics);
        }
        break;
    }
  }

  private handleAudioData(audioData: Uint8Array): void {
    if (this.volume >= 2) {
      console.log("sending audio ");
      this.audioState.addBytesSent(audioData.byteLength);

      if (this.sendAudioToServer) {
        // this.sendAudioToServer(audioData);
      }
    }
  }

  async handleIncomingAudioChunk(chunk: ArrayBuffer): Promise<void> {
    const uint8Array = new Uint8Array(chunk);
    this.audioState.addToBuffer(uint8Array);
    if (!this.audioState.isPlaying()) {
      try {
        await this.attemptPlayback();
      } catch (error) {
        console.error("Error during playback attempt:", error);
      }
    }
  }

  private async attemptPlayback(): Promise<void> {
    const bufferInfo = this.audioState.getBufferInfo();
    const minSize = this.audioState.isPlaying() ? this.config.minBufferSize * 0.75 : this.config.minBufferSize;
    const minChunks = this.audioState.isPlaying() ? this.config.targetChunks * 0.75 : this.config.targetChunks;

    const shouldStart = bufferInfo.totalBytes >= minSize || bufferInfo.chunks >= minChunks || (this.audioState.isStreamComplete() && bufferInfo.totalBytes > 0);

    if (shouldStart) {
      await this.playNextSegment();
    } else if (!this.playbackRetryTimer) {
      this.playbackRetryTimer = setTimeout(() => {
        this.playbackRetryTimer = null;
        this.attemptPlayback();
      }, this.config.playbackRetryInterval);
    }
  }

  private async playNextSegment(): Promise<void> {
    if (this.playbackRetryTimer) {
      clearTimeout(this.playbackRetryTimer);
      this.playbackRetryTimer = null;
    }

    const buffer = this.audioState.getBuffer();
    if (buffer.length === 0) {
      if (this.audioState.isStreamComplete()) {
        await this.completePlayback();
      }
      return;
    }

    const combined = this.combineBuffers(buffer);
    this.audioState.clearBuffer();

    const blob = new Blob([combined.buffer as ArrayBuffer], {type: "audio/mpeg"});
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    this.audioState.setCurrentAudioElement(audio);
    this.audioState.setPlaybackState(AudioPlaybackState.PLAYING);

    audio.onended = () => {
      URL.revokeObjectURL(url);
      Promise.resolve().then(() => this.playNextSegment());
    };

    audio.onerror = error => {
      URL.revokeObjectURL(url);
    };

    try {
      await audio.play();
    } catch (error) {
      console.error("Failed to start audio playback:", error);
    }
  }

  private combineBuffers(buffers: Uint8Array[]): Uint8Array {
    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.byteLength;
    }

    return result;
  }

  async setStreamComplete(): Promise<void> {
    this.audioState.setStreamingComplete(true);

    if (this.audioState.getBufferSize() > 0 && !this.audioState.isPlaying()) {
      await this.playNextSegment();
    }
  }

  private async completePlayback(): Promise<void> {
    this.audioState.setPlaybackState(AudioPlaybackState.COMPLETED);
    await this.resumeMicrophone();
  }

  async pauseMicrophone(): Promise<void> {
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({type: "pause"});
    }
  }

  async resumeMicrophone(): Promise<void> {
    if (this.micResumeTimeout) {
      clearTimeout(this.micResumeTimeout);
    }

    this.micResumeTimeout = setTimeout(async () => {
      if (this.audioWorkletNode) {
        this.audioWorkletNode.port.postMessage({type: "resume"});
      }
      this.micResumeTimeout = null;
    }, this.config.resumeDelay);

    const failsafeTimeout = setTimeout(() => {
      if (this.audioWorkletNode) {
        this.audioWorkletNode.port.postMessage({type: "resume"});
      }
    }, this.config.failsafeResumeTimeout);

    if (this.micResumeTimeout) {
      const originalTimeout = this.micResumeTimeout;
      this.micResumeTimeout = setTimeout(() => {
        clearTimeout(failsafeTimeout);
      }, this.config.resumeDelay) as unknown as NodeJS.Timeout;
    }
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
    if (this.playbackRetryTimer) {
      clearTimeout(this.playbackRetryTimer);
    }

    if (this.micResumeTimeout) {
      clearTimeout(this.micResumeTimeout);
    }

    const currentElement = this.audioState.getCurrentAudioElement();
    if (currentElement) {
      currentElement.pause();
      currentElement.src = "";
    }

    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.audioState.reset();
    this.voiceMetrics.reset();
  }
}
