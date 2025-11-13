export enum AudioPlaybackState {
  IDLE = 'idle',
  BUFFERING = 'buffering',
  PLAYING = 'playing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export enum RecordingState {
  IDLE = 'idle',
  RECORDING = 'recording',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}

export interface AudioConstraints {
  sampleRate: number;
  channelCount: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  groupId: string;
}

export interface AudioChunk {
  data: Uint8Array;
  timestamp: number;
  byteLength: number;
}

export interface AudioBufferInfo {
  chunks: number;
  totalBytes: number;
  duration: number;
  isStreaming: boolean;
}

export interface VoiceActivityMetrics {
  rms: number;
  db: number;
  isActive: boolean;
  isPaused: boolean;
  noiseFloor: number;
  threshold: number;
}

export interface AudioProcessorConfig {
  voiceThreshold: number;
  silenceThreshold: number;
  minSilenceFrames: number;
  maxPreRollBuffers: number;
  sampleRate: number;
}

export interface PlaybackMetrics {
  currentTime: number;
  duration: number;
  buffered: TimeRanges;
  readyState: number;
  networkState: number;
}

export interface RecordingMetrics {
  startTime: number;
  duration: number;
  totalBytes: number;
  sampleRate: number;
  channelCount: number;
}

