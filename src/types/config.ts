import {AudioConstraints, AudioProcessorConfig} from "./audio";

export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}

export interface ModoVoiceConfig {
  apiBase: string;
  chatbotUuid: string;
  userUniqueId: string;

  audio?: Partial<AudioConfig>;
  websocket?: Partial<WebSocketConnectionConfig>;
  logging?: Partial<LoggingConfig>;
  features?: Partial<FeatureConfig>;
}

export interface AudioConfig {
  constraints: AudioConstraints;
  processor: AudioProcessorConfig;
  processorPath: string; // Path to audio-processor.js

  minBufferSize: number;
  targetChunks: number;
  chunkSize: number;

  playbackRetryInterval: number;
  playbackRetryMaxAttempts: number;

  resumeDelay: number;
  failsafeResumeTimeout: number;
}

export interface WebSocketConnectionConfig {
  reconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  reconnectBackoffMultiplier: number;
  maxReconnectDelay: number;

  pingInterval: number;
  pongTimeout: number;
  connectionTimeout: number;

  binaryType: BinaryType;
  protocols?: string | string[];
}

export interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableEvents: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
  customLogger?: (level: LogLevel, message: string, context?: string, data?: unknown) => void;
}

export interface FeatureConfig {
  enableVAD: boolean;
  enableNoiseReduction: boolean;
  enableEchoCancellation: boolean;
  enableAutoGainControl: boolean;

  enableOnHoldAudio: boolean;
  enablePreRollBuffer: boolean;

  enableMetrics: boolean;
  metricsInterval: number;

  enableDebugLogs: boolean;
}

export const DEFAULT_CONFIG: Required<Omit<ModoVoiceConfig, "chatbotUuid" | "userUniqueId">> = {
  apiBase: "https://live.modochats.com",

  audio: {
    constraints: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    processor: {
      voiceThreshold: 0.08,
      silenceThreshold: 0.05,
      minSilenceFrames: 8,
      maxPreRollBuffers: 5,
      sampleRate: 16000
    },
    processorPath: "/audio-processor.js",
    minBufferSize: 32000,
    targetChunks: 16,
    chunkSize: 1024,
    playbackRetryInterval: 10,
    playbackRetryMaxAttempts: 50,
    resumeDelay: 150,
    failsafeResumeTimeout: 10000
  },

  websocket: {
    reconnect: false, // Disabled by default, original client doesn't auto-reconnect
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    reconnectBackoffMultiplier: 1.5,
    maxReconnectDelay: 30000,
    pingInterval: 30000,
    pongTimeout: 5000,
    connectionTimeout: 10000,
    binaryType: "arraybuffer"
  },

  logging: {
    level: LogLevel.INFO,
    enableConsole: true,
    enableEvents: true,
    includeTimestamp: true,
    includeContext: true
  },

  features: {
    enableVAD: true,
    enableNoiseReduction: true,
    enableEchoCancellation: true,
    enableAutoGainControl: true,
    enableOnHoldAudio: true,
    enablePreRollBuffer: true,
    enableMetrics: true,
    metricsInterval: 1000,
    enableDebugLogs: false
  }
};
