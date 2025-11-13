export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error'
}

export enum WebSocketMessageType {
  AUDIO_CHUNK = 'audio_chunk',
  AUDIO_COMPLETE = 'audio_complete',
  PAUSE_INPUT = 'pause_input',
  RESUME_INPUT = 'resume_input',
  START_ON_HOLD = 'start_on_hold', // Server sends this
  STOP_ON_HOLD = 'stop_on_hold',
  CLEAR_BUFFER = 'clear_buffer',
  CLOSE = 'close',
  STATUS = 'status',
  TRANSCRIPT = 'transcript',
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong'
}

export interface WebSocketConfig {
  url: string;
  chatbotUuid: string;
  userUniqueId: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  connectionTimeout?: number;
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: unknown;
  timestamp?: number;
}

export interface AudioChunkMessage extends WebSocketMessage {
  type: WebSocketMessageType.AUDIO_CHUNK;
  data: ArrayBuffer;
}

export interface AudioCompleteMessage extends WebSocketMessage {
  type: WebSocketMessageType.AUDIO_COMPLETE;
}

export interface PauseInputMessage extends WebSocketMessage {
  type: WebSocketMessageType.PAUSE_INPUT;
}

export interface ResumeInputMessage extends WebSocketMessage {
  type: WebSocketMessageType.RESUME_INPUT;
}

export interface StartOnHoldMessage extends WebSocketMessage {
  type: WebSocketMessageType.START_ON_HOLD;
}

export interface StopOnHoldMessage extends WebSocketMessage {
  type: WebSocketMessageType.STOP_ON_HOLD;
}

export interface TranscriptMessage extends WebSocketMessage {
  type: WebSocketMessageType.TRANSCRIPT;
  data: {
    text: string;
    language?: string;
    confidence?: number;
  };
}

export interface ErrorMessage extends WebSocketMessage {
  type: WebSocketMessageType.ERROR;
  data: {
    code?: number;
    message: string;
    details?: unknown;
  };
}

export type IncomingMessage =
  | AudioChunkMessage
  | AudioCompleteMessage
  | PauseInputMessage
  | ResumeInputMessage
  | StartOnHoldMessage
  | StopOnHoldMessage
  | TranscriptMessage
  | ErrorMessage
  | WebSocketMessage;

export interface ConnectionMetrics {
  connectedAt?: number;
  disconnectedAt?: number;
  duration: number;
  reconnectAttempts: number;
  bytesSent: number;
  bytesReceived: number;
  messagesSent: number;
  messagesReceived: number;
}

export interface WebSocketError {
  code?: number;
  reason?: string;
  timestamp: number;
  wasClean: boolean;
}

