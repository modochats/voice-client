export enum ConnectionState {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTING = "disconnecting",
  ERROR = "error"
}

export enum WebSocketMessageType {
  TURN = "TURN",
  AUDIO_CHUNK = "audio_chunk",
  ERROR = "error"
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

export interface TurnMessage extends WebSocketMessage {
  type: WebSocketMessageType.TURN;
  message?: {
    turn: "ai" | "user";
  };
}

export interface AudioChunkMessage extends WebSocketMessage {
  type: WebSocketMessageType.AUDIO_CHUNK;
  data: ArrayBuffer;
}

export interface ErrorMessage extends WebSocketMessage {
  type: WebSocketMessageType.ERROR;
  data?:
    | {
        code?: number;
        message: string;
        details?: unknown;
      }
    | {
        message: string;
      };
}

export type IncomingMessage = TurnMessage | AudioChunkMessage | ErrorMessage | WebSocketMessage;

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
