export enum EventType {
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  CONNECTION_ERROR = "connection_error",

  TURN_CHANGED = "turn_changed",
  MICROPHONE_PAUSED = "microphone_paused",
  MICROPHONE_RESUMED = "microphone_resumed",

  AI_PLAYBACK_CHUNK = "ai_playback_chunk",

  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  DEBUG = "debug"
}

export interface BaseEvent {
  type: EventType;
  timestamp: number;
}

export interface ConnectedEvent extends BaseEvent {
  type: EventType.CONNECTED;
  chatbotUuid: string;
  userUniqueId: string;
}

export interface DisconnectedEvent extends BaseEvent {
  type: EventType.DISCONNECTED;
  reason?: string;
  code?: number;
}

export interface ConnectionErrorEvent extends BaseEvent {
  type: EventType.CONNECTION_ERROR;
  error: Error;
  message: string;
}

export interface AIPlaybackChunkEvent extends BaseEvent {
  type: EventType.AI_PLAYBACK_CHUNK;
  data?: Uint8Array; // Audio chunk data
  size?: number; // Chunk size in bytes
  totalReceived: number;
}

export interface TurnChangedEvent extends BaseEvent {
  type: EventType.TURN_CHANGED;
  turn: "ai" | "user";
}

export interface MicrophonePausedEvent extends BaseEvent {
  type: EventType.MICROPHONE_PAUSED;
}

export interface MicrophoneResumedEvent extends BaseEvent {
  type: EventType.MICROPHONE_RESUMED;
}

export interface ErrorEvent extends BaseEvent {
  type: EventType.ERROR;
  error: Error;
  message: string;
  context?: string;
}

export interface WarningEvent extends BaseEvent {
  type: EventType.WARNING;
  message: string;
  context?: string;
}

export interface InfoEvent extends BaseEvent {
  type: EventType.INFO;
  message: string;
  context?: string;
}

export interface DebugEvent extends BaseEvent {
  type: EventType.DEBUG;
  message: string;
  data?: unknown;
}

export type ModoVoiceEvent =
  | ConnectedEvent
  | DisconnectedEvent
  | ConnectionErrorEvent
  | TurnChangedEvent
  | MicrophonePausedEvent
  | MicrophoneResumedEvent
  | AIPlaybackChunkEvent
  | ErrorEvent
  | WarningEvent
  | InfoEvent
  | DebugEvent;

export type EventListener<T extends ModoVoiceEvent = ModoVoiceEvent> = (event: T) => void | Promise<void>;

export type EventListenerMap = {
  [K in EventType]?: Set<EventListener<Extract<ModoVoiceEvent, {type: K}>>>;
};
