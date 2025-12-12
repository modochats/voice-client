import {AudioConstraints} from "../../shared/types/index";

export interface ModoVoiceConfig {
  apiBase: string;
  chatbotUuid: string;
  userUniqueId: string;

  audio?: Partial<AudioConfig>;
  websocket?: Partial<WebSocketConnectionConfig>;
}

export interface AudioConfig {
  constraints: AudioConstraints;

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
  }
};
