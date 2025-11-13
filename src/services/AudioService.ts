import {EventEmitter} from "./EventEmitter";
import {AudioState} from "../models/AudioState";
import {VoiceMetrics} from "../models/VoiceMetrics";
import {AudioConfig} from "../types/config";
import {AudioPlaybackState, RecordingState, AudioDeviceInfo, VoiceActivityMetrics} from "../types/audio";
import {EventType} from "../types/events";

export class AudioService {
  private eventEmitter: EventEmitter;
  private audioState: AudioState;
  private voiceMetrics: VoiceMetrics;
  private config: AudioConfig;

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

  async initialize(deviceId?: string): Promise<void> {
    try {
      console.log("🔧 Initializing AudioService...");
      console.log(`   Processor Path: ${this.config.processorPath}`);
      console.log(`   Voice Threshold: ${this.config.processor.voiceThreshold}`);
      
      // Get the stream FIRST to determine actual sample rate
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? {exact: deviceId} : undefined,
          ...this.config.constraints
        }
      });
      console.log("✅ Microphone stream obtained");

      this.mediaStream = stream;

      // Create AudioContext WITHOUT specifying sample rate - let it use device's native rate
      // This ensures AudioContext sample rate matches the media stream
      this.audioContext = new AudioContext();
      console.log(`   AudioContext created: ${this.audioContext.sampleRate}Hz`);

      console.log("📦 Loading audio-processor.js...");
      await this.audioContext.audioWorklet.addModule(this.config.processorPath);
      console.log("✅ Audio processor loaded successfully!");

      await this.setupAudioWorklet();

      await this.eventEmitter.emit({
        type: EventType.USER_RECORDING_STARTED,
        timestamp: Date.now(),
        deviceId: deviceId || "default",
        deviceLabel: stream.getAudioTracks()[0]?.label || "Unknown"
      });

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

    console.log("🔌 Setting up audio worklet...");
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.audioWorkletNode = new AudioWorkletNode(this.audioContext, "audio-processor", {
      processorOptions: this.config.processor
    });
    console.log("✅ AudioWorkletNode created");
    console.log("   Processor options:", this.config.processor);

    this.audioWorkletNode.port.onmessage = event => {
      console.log("📨 Message from audio processor:", event.data instanceof ArrayBuffer ? `ArrayBuffer ${event.data.byteLength} bytes` : event.data.type);
      // Handle raw ArrayBuffer (audio data) or structured messages (metrics)
      if (event.data instanceof ArrayBuffer) {
        console.log(`🎵 Raw audio buffer: ${event.data.byteLength} bytes`);
        this.handleAudioData(event.data);
      } else {
        this.handleWorkletMessage(event.data);
      }
    };

    source.connect(this.audioWorkletNode);
    this.audioWorkletNode.connect(this.audioContext.destination);
    console.log("🔗 Audio nodes connected successfully");
  }

  private handleWorkletMessage(data: {
    type: string;
    audioData?: ArrayBuffer;
    rms?: number;
    db?: number;
    isActive?: boolean;
    isPaused?: boolean;
    noiseFloor?: number;
  }): void {
    switch (data.type) {
      case "audioData":
        if (data.audioData) {
          console.log(`🎵 Audio data received from worklet: ${data.audioData.byteLength} bytes`);
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

          this.eventEmitter.emit({
            type: EventType.VOICE_METRICS,
            timestamp: Date.now(),
            ...metrics
          });

          if (data.isActive && !this.voiceMetrics.isVoiceActive()) {
            this.eventEmitter.emit({
              type: EventType.VOICE_DETECTED,
              timestamp: Date.now(),
              rms: data.rms,
              db: data.db
            });
          } else if (!data.isActive && this.voiceMetrics.isVoiceActive()) {
            this.eventEmitter.emit({
              type: EventType.VOICE_ENDED,
              timestamp: Date.now(),
              duration: this.voiceMetrics.getVoiceDuration()
            });
          }
        }
        break;
      
      case "voice-ended":
        console.log("🎬 Voice ended signal received from audio processor");
        this.eventEmitter.emit({
          type: EventType.VOICE_ENDED,
          timestamp: Date.now(),
          duration: this.voiceMetrics.getVoiceDuration()
        });
        break;
    }
  }

  private handleAudioData(audioData: ArrayBuffer): void {
    console.log(`📤 Sending audio data: ${audioData.byteLength} bytes`);
    this.eventEmitter.emit({
      type: EventType.USER_RECORDING_DATA,
      timestamp: Date.now(),
      data: audioData,
      byteLength: audioData.byteLength
    });

    this.audioState.addBytesSent(audioData.byteLength);
  }

  async handleIncomingAudioChunk(chunk: ArrayBuffer): Promise<void> {
    const uint8Array = new Uint8Array(chunk);
    this.audioState.addToBuffer(uint8Array);

    if (!this.audioState.isPlaying()) {
      await this.attemptPlayback();
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
      this.eventEmitter.emit({
        type: EventType.AI_PLAYBACK_ERROR,
        timestamp: Date.now(),
        error: new Error("Audio playback error"),
        message: "Failed to play audio segment"
      });
    };

    try {
      await audio.play();

      if (this.audioState.getPlaybackState() === AudioPlaybackState.PLAYING) {
        await this.eventEmitter.emit({
          type: EventType.AI_PLAYBACK_STARTED,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      await this.eventEmitter.emit({
        type: EventType.AI_PLAYBACK_ERROR,
        timestamp: Date.now(),
        error: error as Error,
        message: "Failed to start audio playback"
      });
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

    await this.eventEmitter.emit({
      type: EventType.AI_PLAYBACK_COMPLETED,
      timestamp: Date.now(),
      totalBytes: this.audioState.getTotalBytesReceived(),
      duration: 0
    });

    await this.resumeMicrophone();
  }

  async pauseMicrophone(): Promise<void> {
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({type: "pause"});

      await this.eventEmitter.emit({
        type: EventType.MICROPHONE_PAUSED,
        timestamp: Date.now(),
        internal: true // Prevent infinite loop
      });
    }
  }

  async resumeMicrophone(): Promise<void> {
    if (this.micResumeTimeout) {
      clearTimeout(this.micResumeTimeout);
    }

    this.micResumeTimeout = setTimeout(async () => {
      if (this.audioWorkletNode) {
        this.audioWorkletNode.port.postMessage({type: "resume"});

        await this.eventEmitter.emit({
          type: EventType.MICROPHONE_RESUMED,
          timestamp: Date.now(),
          internal: true // Prevent infinite loop
        });
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

    await this.eventEmitter.emit({
      type: EventType.USER_RECORDING_STOPPED,
      timestamp: Date.now(),
      duration: 0,
      totalBytes: this.audioState.getTotalBytesSent()
    });
  }
}
