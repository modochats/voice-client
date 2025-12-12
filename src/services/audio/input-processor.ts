import {AudioConfig} from "../shared/types";
import {AudioPlaybackState, RecordingState, AudioBufferInfo, PlaybackMetrics, RecordingMetrics} from "./audio";

export class AudioInputProcessor {
  private playbackState: AudioPlaybackState = AudioPlaybackState.IDLE;
  private recordingState: RecordingState = RecordingState.IDLE;

  private audioQueue: Uint8Array[] = [];
  private audioBuffer: Uint8Array[] = [];
  private audioBufferSize: number = 0;
  private isStreamingComplete: boolean = false;

  private currentAudioElement: HTMLAudioElement | null = null;
  private recordingStartTime: number = 0;
  private playbackStartTime: number = 0;

  private totalBytesReceived: number = 0;
  private totalBytesSent: number = 0;
  private config: AudioConfig;
  private playbackRetryTimer: NodeJS.Timeout | null = null;

  constructor(config: AudioConfig) {
    this.config = config;
  }
  getPlaybackState(): AudioPlaybackState {
    return this.playbackState;
  }

  setPlaybackState(state: AudioPlaybackState): void {
    this.playbackState = state;
  }

  getRecordingState(): RecordingState {
    return this.recordingState;
  }

  setRecordingState(state: RecordingState): void {
    this.recordingState = state;
    if (state === RecordingState.RECORDING) {
      this.recordingStartTime = Date.now();
    }
  }

  isPlaying(): boolean {
    return this.playbackState === AudioPlaybackState.PLAYING;
  }

  isRecording(): boolean {
    return this.recordingState === RecordingState.RECORDING;
  }

  addToQueue(chunk: Uint8Array): void {
    this.audioQueue.push(chunk);
  }

  getQueue(): Uint8Array[] {
    return this.audioQueue;
  }

  clearQueue(): void {
    this.audioQueue = [];
  }

  addToBuffer(chunk: Uint8Array): void {
    this.audioBuffer.push(chunk);
    this.audioBufferSize += chunk.byteLength;
    this.totalBytesReceived += chunk.byteLength;
  }

  getBuffer(): Uint8Array[] {
    return this.audioBuffer;
  }

  getBufferSize(): number {
    return this.audioBufferSize;
  }

  getBufferInfo(): AudioBufferInfo {
    return {
      chunks: this.audioBuffer.length,
      totalBytes: this.audioBufferSize,
      duration: this.audioBufferSize / (this.config.constraints.sampleRate * 2),
      isStreaming: !this.isStreamingComplete
    };
  }

  clearBuffer(): void {
    this.audioBuffer = [];
    this.audioBufferSize = 0;
    this.isStreamingComplete = false;
  }

  setStreamingComplete(complete: boolean): void {
    this.isStreamingComplete = complete;
  }

  isStreamComplete(): boolean {
    return this.isStreamingComplete;
  }

  setCurrentAudioElement(element: HTMLAudioElement | null): void {
    this.currentAudioElement = element;
    if (element) {
      this.playbackStartTime = Date.now();
    }
  }

  getCurrentAudioElement(): HTMLAudioElement | null {
    return this.currentAudioElement;
  }

  getPlaybackMetrics(): PlaybackMetrics | null {
    if (!this.currentAudioElement) return null;

    return {
      currentTime: this.currentAudioElement.currentTime,
      duration: this.currentAudioElement.duration,
      buffered: this.currentAudioElement.buffered,
      readyState: this.currentAudioElement.readyState,
      networkState: this.currentAudioElement.networkState
    };
  }

  getRecordingMetrics(): RecordingMetrics {
    return {
      startTime: this.recordingStartTime,
      duration: this.recordingStartTime ? Date.now() - this.recordingStartTime : 0,
      totalBytes: this.totalBytesSent,
      sampleRate: this.config.constraints.sampleRate,
      channelCount: 1
    };
  }

  addBytesSent(bytes: number): void {
    this.totalBytesSent += bytes;
  }

  getTotalBytesReceived(): number {
    return this.totalBytesReceived;
  }

  getTotalBytesSent(): number {
    return this.totalBytesSent;
  }

  reset(): void {
    if (this.playbackRetryTimer) {
      clearTimeout(this.playbackRetryTimer);
    }
    this.playbackState = AudioPlaybackState.IDLE;
    this.recordingState = RecordingState.IDLE;
    this.audioQueue = [];
    this.audioBuffer = [];
    this.audioBufferSize = 0;
    this.isStreamingComplete = false;
    this.currentAudioElement = null;
    this.recordingStartTime = 0;
    this.playbackStartTime = 0;
  }

  resetPlayback(): void {
    this.playbackState = AudioPlaybackState.IDLE;
    this.audioQueue = [];
    this.audioBuffer = [];
    this.audioBufferSize = 0;
    this.isStreamingComplete = false;
    this.currentAudioElement = null;
    this.playbackStartTime = 0;
    if (this.playbackRetryTimer) {
      clearTimeout(this.playbackRetryTimer);
    }
  }

  resetRecording(): void {
    this.recordingState = RecordingState.IDLE;
    this.recordingStartTime = 0;
    this.totalBytesSent = 0;
  }
  async handleIncomingAudioChunk(unit8Array: Uint8Array): Promise<void> {
    this.addToBuffer(unit8Array);
    if (!this.isPlaying()) {
      try {
        await this.attemptPlayback();
      } catch (error) {
        console.error("Error during playback attempt:", error);
      }
    }
  }

  private async attemptPlayback(): Promise<void> {
    const bufferInfo = this.getBufferInfo();
    const minSize = this.isPlaying() ? this.config.minBufferSize * 0.75 : this.config.minBufferSize;
    const minChunks = this.isPlaying() ? this.config.targetChunks * 0.75 : this.config.targetChunks;

    const shouldStart = bufferInfo.totalBytes >= minSize || bufferInfo.chunks >= minChunks || (this.isStreamComplete() && bufferInfo.totalBytes > 0);
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

    const buffer = this.getBuffer();
    if (buffer.length === 0) {
      if (this.isStreamComplete()) {
        await this.completePlayback();
      }
      return;
    }

    const combined = this.combineBuffers(buffer);
    this.clearBuffer();

    const blob = new Blob([combined.buffer as ArrayBuffer], {type: "audio/mpeg"});
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    this.setCurrentAudioElement(audio);
    this.setPlaybackState(AudioPlaybackState.PLAYING);

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
    this.setStreamingComplete(true);

    if (this.getBufferSize() > 0 && !this.isPlaying()) {
      await this.playNextSegment();
    }
  }
  private async completePlayback(): Promise<void> {
    this.setPlaybackState(AudioPlaybackState.COMPLETED);
    // await this.resumeMicrophone();
  }
}
