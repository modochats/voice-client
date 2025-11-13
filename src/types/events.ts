export enum EventType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTION_ERROR = 'connection_error',
  
  AI_PLAYBACK_STARTED = 'ai_playback_started',
  AI_PLAYBACK_CHUNK = 'ai_playback_chunk',
  AI_PLAYBACK_COMPLETED = 'ai_playback_completed',
  AI_PLAYBACK_ERROR = 'ai_playback_error',
  
  USER_RECORDING_STARTED = 'user_recording_started',
  USER_RECORDING_STOPPED = 'user_recording_stopped',
  USER_RECORDING_DATA = 'user_recording_data',
  
  VOICE_DETECTED = 'voice_detected',
  VOICE_ENDED = 'voice_ended',
  VOICE_METRICS = 'voice_metrics',
  
  MICROPHONE_PAUSED = 'microphone_paused',
  MICROPHONE_RESUMED = 'microphone_resumed',
  
  TRANSCRIPT_RECEIVED = 'transcript_received',
  AI_RESPONSE_RECEIVED = 'ai_response_received',
  
  ON_HOLD_STARTED = 'on_hold_started',
  ON_HOLD_STOPPED = 'on_hold_stopped',
  
  CLEAR_BUFFER = 'clear_buffer',
  
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug'
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

export interface AIPlaybackStartedEvent extends BaseEvent {
  type: EventType.AI_PLAYBACK_STARTED;
  expectedDuration?: number;
}

export interface AIPlaybackChunkEvent extends BaseEvent {
  type: EventType.AI_PLAYBACK_CHUNK;
  data?: Uint8Array; // Audio chunk data
  size?: number; // Chunk size in bytes
  chunkSize?: number; // Legacy field name
  totalReceived: number;
}

export interface AIPlaybackCompletedEvent extends BaseEvent {
  type: EventType.AI_PLAYBACK_COMPLETED;
  totalBytes: number;
  duration: number;
}

export interface AIPlaybackErrorEvent extends BaseEvent {
  type: EventType.AI_PLAYBACK_ERROR;
  error: Error;
  message: string;
}

export interface UserRecordingStartedEvent extends BaseEvent {
  type: EventType.USER_RECORDING_STARTED;
  deviceId: string;
  deviceLabel: string;
}

export interface UserRecordingStoppedEvent extends BaseEvent {
  type: EventType.USER_RECORDING_STOPPED;
  duration: number;
  totalBytes: number;
}

export interface UserRecordingDataEvent extends BaseEvent {
  type: EventType.USER_RECORDING_DATA;
  data: ArrayBuffer;
  byteLength: number;
}

export interface VoiceDetectedEvent extends BaseEvent {
  type: EventType.VOICE_DETECTED;
  rms: number;
  db: number;
}

export interface VoiceEndedEvent extends BaseEvent {
  type: EventType.VOICE_ENDED;
  duration: number;
}

export interface VoiceMetricsEvent extends BaseEvent {
  type: EventType.VOICE_METRICS;
  rms: number;
  db: number;
  isActive: boolean;
  isPaused: boolean;
  noiseFloor: number;
}

export interface MicrophonePausedEvent extends BaseEvent {
  type: EventType.MICROPHONE_PAUSED;
  internal?: boolean; // True if emitted internally, false if from server command
}

export interface MicrophoneResumedEvent extends BaseEvent {
  type: EventType.MICROPHONE_RESUMED;
  internal?: boolean; // True if emitted internally, false if from server command
}

export interface TranscriptReceivedEvent extends BaseEvent {
  type: EventType.TRANSCRIPT_RECEIVED;
  text: string;
  language?: string;
}

export interface AIResponseReceivedEvent extends BaseEvent {
  type: EventType.AI_RESPONSE_RECEIVED;
  text: string;
  conversationId?: string;
}

export interface OnHoldStartedEvent extends BaseEvent {
  type: EventType.ON_HOLD_STARTED;
}

export interface OnHoldStoppedEvent extends BaseEvent {
  type: EventType.ON_HOLD_STOPPED;
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

export interface ClearBufferEvent extends BaseEvent {
  type: EventType.CLEAR_BUFFER;
}

export type ModoVoiceEvent =
  | ConnectedEvent
  | DisconnectedEvent
  | ConnectionErrorEvent
  | AIPlaybackStartedEvent
  | AIPlaybackChunkEvent
  | AIPlaybackCompletedEvent
  | AIPlaybackErrorEvent
  | UserRecordingStartedEvent
  | UserRecordingStoppedEvent
  | UserRecordingDataEvent
  | VoiceDetectedEvent
  | VoiceEndedEvent
  | VoiceMetricsEvent
  | MicrophonePausedEvent
  | MicrophoneResumedEvent
  | TranscriptReceivedEvent
  | AIResponseReceivedEvent
  | OnHoldStartedEvent
  | OnHoldStoppedEvent
  | ClearBufferEvent
  | ErrorEvent
  | WarningEvent
  | InfoEvent
  | DebugEvent;

export type EventListener<T extends ModoVoiceEvent = ModoVoiceEvent> = (event: T) => void | Promise<void>;

export type EventListenerMap = {
  [K in EventType]?: Set<EventListener<Extract<ModoVoiceEvent, { type: K }>>>;
};

