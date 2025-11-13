# Modo Voice Client SDK

> TypeScript/JavaScript SDK for building real-time voice applications with Modo AI

[![npm version](https://img.shields.io/npm/v/@modochats/voice-client.svg)](https://www.npmjs.com/package/@modochats/voice-client)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎙️ **Real-time Voice Communication** - WebSocket-based bidirectional audio streaming
- 🤖 **AI-Powered Conversations** - Integrate with Modo's conversational AI
- 🔊 **Voice Activity Detection (VAD)** - Automatic speech detection with noise reduction
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- 📦 **Event-Driven** - Rich event system for all connection, audio, and voice events
- 🔌 **Easy Integration** - Simple API, works in browser and Node.js
- 🎚️ **Configurable** - Extensive configuration options for audio, connection, and logging
- 📊 **Metrics & Monitoring** - Built-in connection and voice metrics

## Installation

```bash
npm install @modochats/voice-client
```

Or with yarn:

```bash
yarn add @modochats/voice-client
```

Or with pnpm:

```bash
pnpm add @modochats/voice-client
```

## Quick Start

```typescript
import { ModoVoiceClient, EventType } from '@modochats/voice-client';

const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-chatbot-uuid',
  userUniqueId: 'user-123'
});

client.on(EventType.CONNECTED, (event) => {
  console.log('Connected!', event);
});

client.on(EventType.AI_PLAYBACK_STARTED, (event) => {
  console.log('AI is speaking...');
});

client.on(EventType.VOICE_DETECTED, (event) => {
  console.log('User voice detected:', event.rms, event.db);
});

client.on(EventType.TRANSCRIPT_RECEIVED, (event) => {
  console.log('User said:', event.text);
});

await client.connect();
```

## Basic Usage

### Connecting and Disconnecting

```typescript
const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'abc-123',
  userUniqueId: 'user-456'
});

await client.connect();

console.log('Is connected:', client.isConnected());

await client.disconnect();
```

### With Specific Audio Device

```typescript
const devices = await client.getAvailableDevices();
console.log('Available microphones:', devices);

await client.connect(devices[0].deviceId);
```

### Listening to Events

```typescript
const unsubscribe = client.on(EventType.VOICE_METRICS, (event) => {
  console.log(`Voice Level: ${event.rms.toFixed(4)} RMS, ${event.db.toFixed(1)} dB`);
});

unsubscribe();
```

### One-Time Events

```typescript
client.once(EventType.AI_PLAYBACK_COMPLETED, (event) => {
  console.log('AI finished speaking');
});
```

### Listening to All Events

```typescript
client.onAny((event) => {
  console.log('Event:', event.type, event);
});
```

## Configuration

### Full Configuration Example

```typescript
const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-chatbot-uuid',
  userUniqueId: 'user-123',
  
  audio: {
    constraints: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    processor: {
      voiceThreshold: 0.25,
      silenceThreshold: 0.15,
      minSilenceFrames: 8,
      maxPreRollBuffers: 5,
      sampleRate: 16000
    },
    minBufferSize: 40000,
    targetChunks: 20,
    chunkSize: 1024,
    playbackRetryInterval: 10,
    playbackRetryMaxAttempts: 50,
    resumeDelay: 200,
    failsafeResumeTimeout: 10000
  },
  
  websocket: {
    reconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    reconnectBackoffMultiplier: 1.5,
    maxReconnectDelay: 30000,
    pingInterval: 30000,
    pongTimeout: 5000,
    connectionTimeout: 10000,
    binaryType: 'arraybuffer'
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
});
```

### Configuration Options

#### Audio Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `constraints.sampleRate` | number | 16000 | Audio sample rate in Hz |
| `constraints.channelCount` | number | 1 | Number of audio channels |
| `constraints.echoCancellation` | boolean | true | Enable echo cancellation |
| `constraints.noiseSuppression` | boolean | true | Enable noise suppression |
| `constraints.autoGainControl` | boolean | true | Enable automatic gain control |
| `processor.voiceThreshold` | number | 0.25 | Voice detection threshold (0-1) |
| `processor.silenceThreshold` | number | 0.15 | Silence detection threshold (0-1) |
| `minBufferSize` | number | 40000 | Minimum buffer size before playback (bytes) |
| `targetChunks` | number | 20 | Target number of chunks to buffer |

#### WebSocket Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `reconnect` | boolean | true | Enable automatic reconnection |
| `maxReconnectAttempts` | number | 5 | Maximum reconnection attempts |
| `reconnectDelay` | number | 1000 | Initial reconnect delay (ms) |
| `reconnectBackoffMultiplier` | number | 1.5 | Backoff multiplier for reconnects |
| `pingInterval` | number | 30000 | WebSocket ping interval (ms) |
| `connectionTimeout` | number | 10000 | Connection timeout (ms) |

#### Logging Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | LogLevel | INFO | Logging level (NONE, ERROR, WARN, INFO, DEBUG) |
| `enableConsole` | boolean | true | Enable console logging |
| `enableEvents` | boolean | true | Emit log events |
| `includeTimestamp` | boolean | true | Include timestamps in logs |
| `includeContext` | boolean | true | Include context in logs |

## Events

### Connection Events

```typescript
EventType.CONNECTED
EventType.DISCONNECTED
EventType.CONNECTION_ERROR
```

### AI Playback Events

```typescript
EventType.AI_PLAYBACK_STARTED
EventType.AI_PLAYBACK_CHUNK
EventType.AI_PLAYBACK_COMPLETED
EventType.AI_PLAYBACK_ERROR
```

### Recording Events

```typescript
EventType.USER_RECORDING_STARTED
EventType.USER_RECORDING_STOPPED
EventType.USER_RECORDING_DATA
```

### Voice Detection Events

```typescript
EventType.VOICE_DETECTED
EventType.VOICE_ENDED
EventType.VOICE_METRICS
```

### Microphone Events

```typescript
EventType.MICROPHONE_PAUSED
EventType.MICROPHONE_RESUMED
```

### Message Events

```typescript
EventType.TRANSCRIPT_RECEIVED
EventType.AI_RESPONSE_RECEIVED
```

### On-Hold Events

```typescript
EventType.ON_HOLD_STARTED
EventType.ON_HOLD_STOPPED
```

### Log Events

```typescript
EventType.ERROR
EventType.WARNING
EventType.INFO
EventType.DEBUG
```

## API Reference

### ModoVoiceClient

#### Constructor

```typescript
new ModoVoiceClient(config: ModoVoiceConfig)
```

#### Methods

##### connect(deviceId?: string): Promise<void>
Connect to the Modo Voice service with optional device ID.

##### disconnect(): Promise<void>
Disconnect from the service and cleanup resources.

##### on<T>(eventType: T, listener: EventListener): () => void
Subscribe to an event. Returns unsubscribe function.

##### once<T>(eventType: T, listener: EventListener): () => void
Subscribe to an event once. Returns unsubscribe function.

##### off<T>(eventType: T, listener: EventListener): void
Unsubscribe from an event.

##### onAny(listener: EventListener): () => void
Subscribe to all events.

##### offAny(listener: EventListener): void
Unsubscribe from all events.

##### isConnected(): boolean
Check if currently connected.

##### isInitialized(): boolean
Check if audio system is initialized.

##### getConnectionMetrics(): ConnectionMetrics
Get connection statistics.

##### getVoiceMetrics(): VoiceActivityMetrics
Get current voice activity metrics.

##### getAvailableDevices(): Promise<AudioDeviceInfo[]>
Get list of available audio input devices.

##### setLogLevel(level: LogLevel): void
Change logging level at runtime.

##### getConfig(): ModoVoiceConfig
Get current configuration.

##### updateConfig(updates: Partial<ModoVoiceConfig>): void
Update configuration (only when disconnected).

## Examples

### React Integration

```typescript
import { useEffect, useState } from 'react';
import { ModoVoiceClient, EventType } from '@modochats/voice-client';

function VoiceChat() {
  const [client] = useState(() => new ModoVoiceClient({
    apiBase: 'https://live.modochats.com',
    chatbotUuid: 'your-chatbot-uuid',
    userUniqueId: 'user-123'
  }));
  
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    client.on(EventType.CONNECTED, () => setIsConnected(true));
    client.on(EventType.DISCONNECTED, () => setIsConnected(false));
    
    client.on(EventType.TRANSCRIPT_RECEIVED, (event) => {
      setTranscript(event.text);
    });
    
    client.on(EventType.VOICE_DETECTED, () => setVoiceActive(true));
    client.on(EventType.VOICE_ENDED, () => setVoiceActive(false));

    return () => {
      client.disconnect();
    };
  }, [client]);

  const handleConnect = async () => {
    await client.connect();
  };

  const handleDisconnect = async () => {
    await client.disconnect();
  };

  return (
    <div>
      <h1>Modo Voice Chat</h1>
      <button onClick={isConnected ? handleDisconnect : handleConnect}>
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>
      
      <div>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      
      <div>
        Voice: {voiceActive ? '🎤 Active' : '⏸ Silent'}
      </div>
      
      <div>
        Transcript: {transcript}
      </div>
    </div>
  );
}
```

### Vue Integration

```vue
<template>
  <div>
    <h1>Modo Voice Chat</h1>
    <button @click="isConnected ? disconnect() : connect()">
      {{ isConnected ? 'Disconnect' : 'Connect' }}
    </button>
    
    <div>Status: {{ isConnected ? '🟢 Connected' : '🔴 Disconnected' }}</div>
    <div>Voice: {{ voiceActive ? '🎤 Active' : '⏸ Silent' }}</div>
    <div>Transcript: {{ transcript }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ModoVoiceClient, EventType } from '@modochats/voice-client';

const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-chatbot-uuid',
  userUniqueId: 'user-123'
});

const isConnected = ref(false);
const transcript = ref('');
const voiceActive = ref(false);

onMounted(() => {
  client.on(EventType.CONNECTED, () => isConnected.value = true);
  client.on(EventType.DISCONNECTED, () => isConnected.value = false);
  client.on(EventType.TRANSCRIPT_RECEIVED, (e) => transcript.value = e.text);
  client.on(EventType.VOICE_DETECTED, () => voiceActive.value = true);
  client.on(EventType.VOICE_ENDED, () => voiceActive.value = false);
});

onUnmounted(() => {
  client.disconnect();
});

const connect = () => client.connect();
const disconnect = () => client.disconnect();
</script>
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Modo Voice Client</title>
  <script type="module">
    import { ModoVoiceClient, EventType } from 'https://unpkg.com/@modochats/voice-client';
    
    const client = new ModoVoiceClient({
      apiBase: 'https://live.modochats.com',
      chatbotUuid: 'your-chatbot-uuid',
      userUniqueId: 'user-123'
    });
    
    client.on(EventType.CONNECTED, () => {
      document.getElementById('status').textContent = 'Connected';
    });
    
    client.on(EventType.VOICE_METRICS, (event) => {
      document.getElementById('voice').textContent = 
        `RMS: ${event.rms.toFixed(4)}, dB: ${event.db.toFixed(1)}`;
    });
    
    document.getElementById('connect').onclick = () => client.connect();
    document.getElementById('disconnect').onclick = () => client.disconnect();
  </script>
</head>
<body>
  <h1>Modo Voice Client</h1>
  <button id="connect">Connect</button>
  <button id="disconnect">Disconnect</button>
  <div id="status">Disconnected</div>
  <div id="voice"></div>
</body>
</html>
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { 
  ModoVoiceClient,
  ModoVoiceConfig,
  EventType,
  ConnectedEvent,
  VoiceMetricsEvent,
  AudioDeviceInfo,
  ConnectionMetrics,
  LogLevel
} from '@modochats/voice-client';

const config: ModoVoiceConfig = {
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'abc-123',
  userUniqueId: 'user-456'
};

const client = new ModoVoiceClient(config);

client.on(EventType.VOICE_METRICS, (event: VoiceMetricsEvent) => {
  console.log(event.rms, event.db, event.isActive);
});
```

## Browser Compatibility

- Chrome/Edge 89+
- Firefox 88+
- Safari 15+
- Opera 75+

Requires:
- WebSocket support
- Web Audio API
- AudioWorklet API
- MediaStream API

## License

MIT © Modo Team

## Support

- 📧 Email: support@modochats.com
- 🌐 Website: https://modochats.com
- 📖 Documentation: https://docs.modochats.com
- 🐛 Issues: https://github.com/modochats/voice-client/issues

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes.

