# Modo Voice Client SDK

> TypeScript/JavaScript SDK for building real-time voice applications with Modo AI

[![npm version](https://img.shields.io/npm/v/@modochats/voice-client.svg)](https://www.npmjs.com/package/@modochats/voice-client) [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🎙️ **Real-time Voice Communication** - WebSocket-based bidirectional audio streaming
- 🤖 **AI-Powered Conversations** - Integrate with Modo's conversational AI
- 🔊 **Voice Activity Detection (VAD)** - Automatic speech detection with noise reduction
- 🎯 **Type-Safe** - Full TypeScript support with comprehensive type definitions
- 📦 **Event-Driven** - Rich event system for all connection, audio, and voice events
- 🔌 **Easy Integration** - Simple API, works in browser and Node.js
- 🎚️ **Configurable** - Extensive configuration options for audio, connection
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
import {VoiceClient, EventType} from "@modochats/voice-client";

const client = new VoiceClient({
  apiBase: "https://live.modochats.com",
  chatbotUuid: "your-chatbot-uuid",
  userUniqueId: "user-123"
});

client.on(EventType.CONNECTED, event => {
  console.log("Connected!", event);
});
client.on(EventType.DISCONNECTED, event => {
  console.log("Disconnected!", event);
});

client.on(EventType.MICROPHONE_PAUSED, event => {
  console.log("Microphone paused:", event);
});

client.on(EventType.MICROPHONE_RESUMED, event => {
  console.log("Microphone resumed:", event);
});

await client.connect();
```

## Basic Usage

### Connecting and Disconnecting

```typescript
const client = new VoiceClient({
  apiBase: "https://live.modochats.com",
  chatbotUuid: "abc-123",
  userUniqueId: "user-456"
});

await client.connect();

console.log("Is connected:", client.isConnected());

await client.disconnect();
```

### With Specific Audio Device

```typescript
const devices = await client.getAvailableDevices();
console.log("Available microphones:", devices);

await client.connect(devices[0].deviceId);
```

### Listening to Events

```typescript
const unsubscribe = client.on(EventType.VOICE_METRICS, event => {
  console.log(`Voice Level: ${event.rms.toFixed(4)} RMS, ${event.db.toFixed(1)} dB`);
});

unsubscribe();
```

### One-Time Events

```typescript
client.once(EventType.MICROPHONE_PAUSED, event => {
  console.log("Microphone paused while AI is speaking");
});
```

### Listening to All Events

```typescript
client.onAny(event => {
  console.log("Event:", event.type, event);
});
```

## Configuration

### Full Configuration Example

```typescript
const client = new VoiceClient({
  apiBase: "https://live.modochats.com",
  chatbotUuid: "your-chatbot-uuid",
  userUniqueId: "user-123",

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
    reconnect: false,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    reconnectBackoffMultiplier: 1.5,
    maxReconnectDelay: 30000,
    pingInterval: 30000,
    pongTimeout: 5000,
    connectionTimeout: 10000,
    binaryType: "arraybuffer"
  }
});
```

### Configuration Options

#### Audio Configuration

| Option                         | Type    | Default | Description                                 |
| ------------------------------ | ------- | ------- | ------------------------------------------- |
| `constraints.sampleRate`       | number  | 16000   | Audio sample rate in Hz                     |
| `constraints.channelCount`     | number  | 1       | Number of audio channels                    |
| `constraints.echoCancellation` | boolean | true    | Enable echo cancellation                    |
| `constraints.noiseSuppression` | boolean | true    | Enable noise suppression                    |
| `constraints.autoGainControl`  | boolean | true    | Enable automatic gain control               |
| `minBufferSize`                | number  | 32000   | Minimum buffer size before playback (bytes) |
| `targetChunks`                 | number  | 16      | Target number of chunks to buffer           |
| `chunkSize`                    | number  | 1024    | Size of each audio chunk (bytes)            |
| `playbackRetryInterval`        | number  | 10      | Retry interval for playback (ms)            |
| `playbackRetryMaxAttempts`     | number  | 50      | Maximum playback retry attempts             |
| `resumeDelay`                  | number  | 150     | Delay before resuming playback (ms)         |
| `failsafeResumeTimeout`        | number  | 10000   | Failsafe resume timeout (ms)                |

#### WebSocket Configuration

| Option                       | Type    | Default       | Description                       |
| ---------------------------- | ------- | ------------- | --------------------------------- |
| `reconnect`                  | boolean | false         | Enable automatic reconnection     |
| `maxReconnectAttempts`       | number  | 5             | Maximum reconnection attempts     |
| `reconnectDelay`             | number  | 1000          | Initial reconnect delay (ms)      |
| `reconnectBackoffMultiplier` | number  | 1.5           | Backoff multiplier for reconnects |
| `maxReconnectDelay`          | number  | 30000         | Maximum reconnect delay (ms)      |
| `pingInterval`               | number  | 30000         | WebSocket ping interval (ms)      |
| `pongTimeout`                | number  | 5000          | Pong response timeout (ms)        |
| `connectionTimeout`          | number  | 10000         | Connection timeout (ms)           |
| `binaryType`                 | string  | "arraybuffer" | Binary message type               |

## Events

### Connection Events

```typescript
EventType.CONNECTED;
EventType.DISCONNECTED;
EventType.CONNECTION_ERROR;
```

### AI Playback Events

````

### Audio Events

```typescript
EventType.AI_PLAYBACK_CHUNK      // Incoming audio chunk from server
EventType.TURN_CHANGED            // Indicates whose turn to speak (ai | user)
EventType.MICROPHONE_PAUSED       // Microphone paused (when AI is speaking)
EventType.MICROPHONE_RESUMED      // Microphone resumed (when it's user's turn)
````

### Connection Events

```typescript
EventType.CONNECTED; // Successfully connected to server
EventType.DISCONNECTED; // Disconnected from server
EventType.CONNECTION_ERROR; // Connection error occurred
```

### Log Events

```typescript
EventType.ERROR;
EventType.WARNING;
EventType.INFO;
EventType.DEBUG;
```

## API Reference

### VoiceClient

```

### Recording Events

```

## API Reference

### VoiceClient

````

#### Methods

- `connect(deviceId?: string): Promise<void>` - Connect to the server and initialize audio
- `disconnect(): Promise<void>` - Disconnect from the server and cleanup audio
- `on<T>(eventType: T, listener: EventListener): () => void` - Register event listener
- `once<T>(eventType: T, listener: EventListener): () => void` - Register one-time event listener
- `onAny(listener: EventListener): () => void` - Listen to all events
- `isConnected(): boolean` - Check connection status
- `getAvailableDevices(): Promise<AudioDeviceInfo[]>` - Get available audio devices
- `getConnectionMetrics(): ConnectionMetrics` - Get connection statistics
- `getConfig(): Required<ModoVoiceConfig>` - Get current configuration
- `updateConfig(updates: Partial<ModoVoiceConfig>): void` - Update configuration

#### Events

##### Core Events
- `CONNECTED` - Connected to server
- `DISCONNECTED` - Disconnected from server
- `CONNECTION_ERROR` - Connection error
- `TURN_CHANGED` - Whose turn it is (ai | user)
- `AI_PLAYBACK_CHUNK` - Incoming audio chunk
- `MICROPHONE_PAUSED` - Microphone paused
- `MICROPHONE_RESUMED` - Microphone resumed
- `ERROR` - Error occurred
- `INFO` - Information message
- `DEBUG` - Debug message

###

## API Reference

### VoiceClient

#### Constructor

```typescript
new VoiceClient(config: ModoVoiceConfig)
````

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

##### getAvailableDevices(): Promise<AudioDeviceInfo[]>

Get list of available audio input devices.

##### getConfig(): ModoVoiceConfig

Get current configuration.

##### updateConfig(updates: Partial<ModoVoiceConfig>): void

Update configuration (only when disconnected).

## Examples

### React Integration

```typescript
import {useEffect, useState} from "react";
import {VoiceClient, EventType} from "@modochats/voice-client";

function VoiceChat() {
  const [client] = useState(
    () =>
      new VoiceClient({
        apiBase: "https://live.modochats.com",
        chatbotUuid: "your-chatbot-uuid",
        userUniqueId: "user-123"
      })
  );

  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);

  useEffect(() => {
    client.on(EventType.CONNECTED, () => setIsConnected(true));
    client.on(EventType.DISCONNECTED, () => setIsConnected(false));

    client.on(EventType.TRANSCRIPT_RECEIVED, event => {
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
      <button onClick={isConnected ? handleDisconnect : handleConnect}>{isConnected ? "Disconnect" : "Connect"}</button>

      <div>Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}</div>

      <div>Voice: {voiceActive ? "🎤 Active" : "⏸ Silent"}</div>

      <div>Transcript: {transcript}</div>
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
      {{ isConnected ? "Disconnect" : "Connect" }}
    </button>

    <div>Status: {{ isConnected ? "🟢 Connected" : "🔴 Disconnected" }}</div>
    <div>Voice: {{ voiceActive ? "🎤 Active" : "⏸ Silent" }}</div>
    <div>Transcript: {{ transcript }}</div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted} from "vue";
import {VoiceClient, EventType} from "@modochats/voice-client";

const client = new VoiceClient({
  apiBase: "https://live.modochats.com",
  chatbotUuid: "your-chatbot-uuid",
  userUniqueId: "user-123"
});

const isConnected = ref(false);
const transcript = ref("");
const voiceActive = ref(false);

onMounted(() => {
  client.on(EventType.CONNECTED, () => (isConnected.value = true));
  client.on(EventType.DISCONNECTED, () => (isConnected.value = false));
  client.on(EventType.TRANSCRIPT_RECEIVED, e => (transcript.value = e.text));
  client.on(EventType.VOICE_DETECTED, () => (voiceActive.value = true));
  client.on(EventType.VOICE_ENDED, () => (voiceActive.value = false));
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
      import {VoiceClient, EventType} from "https://unpkg.com/@modochats/voice-client";

      const client = new VoiceClient({
        apiBase: "https://live.modochats.com",
        chatbotUuid: "your-chatbot-uuid",
        userUniqueId: "user-123"
      });

      client.on(EventType.CONNECTED, () => {
        document.getElementById("status").textContent = "Connected";
      });

      client.on(EventType.VOICE_METRICS, event => {
        document.getElementById("voice").textContent = `RMS: ${event.rms.toFixed(4)}, dB: ${event.db.toFixed(1)}`;
      });

      document.getElementById("connect").onclick = () => client.connect();
      document.getElementById("disconnect").onclick = () => client.disconnect();
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
import {VoiceClient, ModoVoiceConfig, EventType, ConnectedEvent, AudioDeviceInfo, ConnectionMetrics, LogLevel} from "@modochats/voice-client";

const config: ModoVoiceConfig = {
  apiBase: "https://live.modochats.com",
  chatbotUuid: "abc-123",
  userUniqueId: "user-456"
};

const client = new VoiceClient(config);
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
