# Modo Voice Client API Documentation

## Table of Contents

- [ModoVoiceClient](#modovoiceclient)
- [Configuration](#configuration)
- [Events](#events)
- [Types](#types)
- [Models](#models)
- [Utilities](#utilities)

## ModoVoiceClient

Main class for interacting with the Modo Voice service.

### Constructor

```typescript
new ModoVoiceClient(config: ModoVoiceConfig)
```

Creates a new instance of the Modo Voice Client.

**Parameters:**
- `config`: Configuration object (see [Configuration](#configuration))

**Throws:**
- `ValidationError`: If configuration is invalid

**Example:**
```typescript
const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'abc-123',
  userUniqueId: 'user-456'
});
```

### Methods

#### connect(deviceId?: string): Promise<void>

Connects to the Modo Voice service and initializes audio capture.

**Parameters:**
- `deviceId` (optional): ID of the audio input device to use

**Returns:** Promise that resolves when connection is established

**Throws:**
- `Error`: If connection fails or microphone access is denied

**Example:**
```typescript
await client.connect();

await client.connect('specific-device-id');
```

#### disconnect(): Promise<void>

Disconnects from the service and releases all resources.

**Returns:** Promise that resolves when disconnection is complete

**Example:**
```typescript
await client.disconnect();
```

#### on<T>(eventType: T, listener: EventListener<T>): () => void

Subscribes to an event.

**Parameters:**
- `eventType`: Type of event to listen for (see [Events](#events))
- `listener`: Callback function to invoke when event occurs

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = client.on(EventType.CONNECTED, (event) => {
  console.log('Connected!', event);
});

unsubscribe();
```

#### once<T>(eventType: T, listener: EventListener<T>): () => void

Subscribes to an event for one occurrence only.

**Parameters:**
- `eventType`: Type of event to listen for
- `listener`: Callback function to invoke when event occurs

**Returns:** Unsubscribe function

**Example:**
```typescript
client.once(EventType.CONNECTED, (event) => {
  console.log('First connection!');
});
```

#### off<T>(eventType: T, listener: EventListener<T>): void

Unsubscribes from an event.

**Parameters:**
- `eventType`: Type of event to unsubscribe from
- `listener`: Listener function to remove

**Example:**
```typescript
const listener = (event) => console.log(event);
client.on(EventType.CONNECTED, listener);
client.off(EventType.CONNECTED, listener);
```

#### onAny(listener: EventListener): () => void

Subscribes to all events.

**Parameters:**
- `listener`: Callback function to invoke for any event

**Returns:** Unsubscribe function

**Example:**
```typescript
const unsubscribe = client.onAny((event) => {
  console.log('Event:', event.type, event);
});
```

#### offAny(listener: EventListener): void

Unsubscribes from all events.

**Parameters:**
- `listener`: Listener function to remove

#### isConnected(): boolean

Checks if currently connected to the service.

**Returns:** `true` if connected, `false` otherwise

**Example:**
```typescript
if (client.isConnected()) {
  console.log('Currently connected');
}
```

#### isInitialized(): boolean

Checks if audio system is initialized.

**Returns:** `true` if initialized, `false` otherwise

#### getConnectionMetrics(): ConnectionMetrics

Gets current connection metrics and statistics.

**Returns:** Connection metrics object

**Example:**
```typescript
const metrics = client.getConnectionMetrics();
console.log('Duration:', metrics.duration);
console.log('Bytes sent:', metrics.bytesSent);
console.log('Bytes received:', metrics.bytesReceived);
```

#### getVoiceMetrics(): VoiceActivityMetrics

Gets current voice activity metrics.

**Returns:** Voice metrics object

**Example:**
```typescript
const metrics = client.getVoiceMetrics();
console.log('RMS:', metrics.rms);
console.log('dB:', metrics.db);
console.log('Active:', metrics.isActive);
```

#### getAvailableDevices(): Promise<AudioDeviceInfo[]>

Gets list of available audio input devices.

**Returns:** Promise that resolves to array of device info

**Example:**
```typescript
const devices = await client.getAvailableDevices();
devices.forEach(device => {
  console.log(device.label, device.deviceId);
});
```

#### setLogLevel(level: LogLevel): void

Changes the logging level at runtime.

**Parameters:**
- `level`: New log level (NONE, ERROR, WARN, INFO, DEBUG)

**Example:**
```typescript
client.setLogLevel(LogLevel.DEBUG);
```

#### getConfig(): ModoVoiceConfig

Gets the current configuration.

**Returns:** Current configuration object (readonly copy)

#### updateConfig(updates: Partial<ModoVoiceConfig>): void

Updates configuration (only when disconnected).

**Parameters:**
- `updates`: Partial configuration to merge

**Throws:**
- `Error`: If called while connected

**Example:**
```typescript
client.updateConfig({
  logging: {
    level: LogLevel.DEBUG
  }
});
```

## Configuration

### ModoVoiceConfig

Main configuration interface.

```typescript
interface ModoVoiceConfig {
  apiBase: string;
  chatbotUuid: string;
  userUniqueId: string;
  audio?: Partial<AudioConfig>;
  websocket?: Partial<WebSocketConnectionConfig>;
  logging?: Partial<LoggingConfig>;
  features?: Partial<FeatureConfig>;
}
```

### AudioConfig

Audio system configuration.

```typescript
interface AudioConfig {
  constraints: AudioConstraints;
  processor: AudioProcessorConfig;
  minBufferSize: number;
  targetChunks: number;
  chunkSize: number;
  playbackRetryInterval: number;
  playbackRetryMaxAttempts: number;
  resumeDelay: number;
  failsafeResumeTimeout: number;
}
```

### WebSocketConnectionConfig

WebSocket connection configuration.

```typescript
interface WebSocketConnectionConfig {
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
```

### LoggingConfig

Logging configuration.

```typescript
interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableEvents: boolean;
  includeTimestamp: boolean;
  includeContext: boolean;
  customLogger?: (level: LogLevel, message: string, context?: string, data?: unknown) => void;
}
```

### FeatureConfig

Feature flags configuration.

```typescript
interface FeatureConfig {
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
```

## Events

### EventType Enum

All available event types:

```typescript
enum EventType {
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
  
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug'
}
```

### Event Interfaces

#### ConnectedEvent

```typescript
interface ConnectedEvent {
  type: EventType.CONNECTED;
  timestamp: number;
  chatbotUuid: string;
  userUniqueId: string;
}
```

#### DisconnectedEvent

```typescript
interface DisconnectedEvent {
  type: EventType.DISCONNECTED;
  timestamp: number;
  reason?: string;
  code?: number;
}
```

#### VoiceMetricsEvent

```typescript
interface VoiceMetricsEvent {
  type: EventType.VOICE_METRICS;
  timestamp: number;
  rms: number;
  db: number;
  isActive: boolean;
  isPaused: boolean;
  noiseFloor: number;
}
```

#### TranscriptReceivedEvent

```typescript
interface TranscriptReceivedEvent {
  type: EventType.TRANSCRIPT_RECEIVED;
  timestamp: number;
  text: string;
  language?: string;
}
```

## Types

### AudioDeviceInfo

```typescript
interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  groupId: string;
}
```

### ConnectionMetrics

```typescript
interface ConnectionMetrics {
  connectedAt?: number;
  disconnectedAt?: number;
  duration: number;
  reconnectAttempts: number;
  bytesSent: number;
  bytesReceived: number;
  messagesSent: number;
  messagesReceived: number;
}
```

### VoiceActivityMetrics

```typescript
interface VoiceActivityMetrics {
  rms: number;
  db: number;
  isActive: boolean;
  isPaused: boolean;
  noiseFloor: number;
  threshold: number;
}
```

### LogLevel Enum

```typescript
enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4
}
```

## Models

### AudioState

Manages audio playback and recording state.

**Methods:**
- `getPlaybackState(): AudioPlaybackState`
- `setPlaybackState(state: AudioPlaybackState): void`
- `getRecordingState(): RecordingState`
- `setRecordingState(state: RecordingState): void`
- `isPlaying(): boolean`
- `isRecording(): boolean`
- `getBufferInfo(): AudioBufferInfo`
- `reset(): void`

### ConnectionState

Manages WebSocket connection state and metrics.

**Methods:**
- `getState(): ConnectionState`
- `setState(state: ConnectionState): void`
- `isConnected(): boolean`
- `getMetrics(): ConnectionMetrics`
- `incrementReconnectAttempts(): void`
- `reset(): void`

### VoiceMetrics

Tracks voice activity metrics and history.

**Methods:**
- `update(metrics: VoiceActivityMetrics): void`
- `getCurrent(): VoiceActivityMetrics`
- `getRMS(): number`
- `getDB(): number`
- `isVoiceActive(): boolean`
- `getHistory(count?: number): VoiceActivityMetrics[]`
- `getAverageRMS(count?: number): number`
- `getPeakRMS(): number`
- `reset(): void`

## Utilities

### Validators

```typescript
function validateConfig(config: ModoVoiceConfig): void
function isValidUUID(uuid: string): boolean
function isValidURL(url: string): boolean
function sanitizeString(input: string, maxLength?: number): string
```

### Logger

```typescript
class Logger {
  error(message: string, context?: string, data?: unknown): void
  warn(message: string, context?: string, data?: unknown): void
  info(message: string, context?: string, data?: unknown): void
  debug(message: string, context?: string, data?: unknown): void
  setLevel(level: LogLevel): void
  getLevel(): LogLevel
}
```

### Formatting Utilities

```typescript
function formatBytes(bytes: number): string
function formatDuration(ms: number): string
function formatTimestamp(timestamp: number): string
```

## Error Handling

### ValidationError

Thrown when configuration validation fails.

```typescript
class ValidationError extends Error {
  constructor(message: string)
}
```

**Example:**
```typescript
try {
  const client = new ModoVoiceClient({
    apiBase: 'invalid',
    chatbotUuid: 'not-a-uuid',
    userUniqueId: ''
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Config error:', error.message);
  }
}
```

## Best Practices

### 1. Always Clean Up

```typescript
try {
  await client.connect();
} finally {
  await client.disconnect();
}
```

### 2. Handle Errors

```typescript
client.on(EventType.ERROR, (event) => {
  console.error('Error:', event.message);
});

client.on(EventType.CONNECTION_ERROR, (event) => {
  console.error('Connection error:', event.message);
});
```

### 3. Monitor Metrics

```typescript
setInterval(() => {
  const metrics = client.getConnectionMetrics();
  console.log('Bytes sent:', metrics.bytesSent);
}, 5000);
```

### 4. Use TypeScript

Take advantage of full type safety:

```typescript
import { ModoVoiceClient, EventType, ConnectedEvent } from '@modochats/voice-client';

client.on(EventType.CONNECTED, (event: ConnectedEvent) => {
  console.log(event.chatbotUuid);
});
```

### 5. Unsubscribe When Done

```typescript
const unsubscribe = client.on(EventType.VOICE_METRICS, handler);

cleanup() {
  unsubscribe();
}
```

