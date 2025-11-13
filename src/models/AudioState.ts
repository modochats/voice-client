import { AudioPlaybackState, RecordingState, AudioBufferInfo, PlaybackMetrics, RecordingMetrics } from '../types/audio';

export class AudioState {
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
      duration: this.audioBufferSize / (16000 * 2),
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
      sampleRate: 16000,
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
  }

  resetRecording(): void {
    this.recordingState = RecordingState.IDLE;
    this.recordingStartTime = 0;
    this.totalBytesSent = 0;
  }
}

