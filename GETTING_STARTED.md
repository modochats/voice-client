# Getting Started with Modo Voice Client SDK

This guide will help you get started with the Modo Voice Client SDK in just a few minutes.

## Prerequisites

- Node.js 16+ or modern browser
- npm, yarn, or pnpm
- Modo account with a chatbot UUID

## Installation

Choose your preferred package manager:

```bash
npm install @modochats/voice-client
```

```bash
yarn add @modochats/voice-client
```

```bash
pnpm add @modochats/voice-client
```

## Quick Start (5 minutes)

### Step 1: Import the SDK

```typescript
import { ModoVoiceClient, EventType } from '@modochats/voice-client';
```

### Step 2: Create a Client Instance

```typescript
const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-chatbot-uuid',
  userUniqueId: 'user-12345'
});
```

### Step 3: Add Event Listeners

```typescript
client.on(EventType.CONNECTED, () => {
  console.log('Connected! Start speaking...');
});

client.on(EventType.VOICE_DETECTED, () => {
  console.log('Listening...');
});

client.on(EventType.TRANSCRIPT_RECEIVED, (event) => {
  console.log('You said:', event.text);
});

client.on(EventType.AI_RESPONSE_RECEIVED, (event) => {
  console.log('AI said:', event.text);
});
```

### Step 4: Connect

```typescript
await client.connect();
```

### Step 5: Disconnect When Done

```typescript
await client.disconnect();
```

## Complete Example

```typescript
import { ModoVoiceClient, EventType } from '@modochats/voice-client';

async function startVoiceChat() {
  const client = new ModoVoiceClient({
    apiBase: 'https://live.modochats.com',
    chatbotUuid: 'your-chatbot-uuid',
    userUniqueId: 'user-12345'
  });

  client.on(EventType.CONNECTED, () => {
    console.log('✅ Connected! Start speaking...');
  });

  client.on(EventType.VOICE_DETECTED, () => {
    console.log('🎤 Listening...');
  });

  client.on(EventType.TRANSCRIPT_RECEIVED, (event) => {
    console.log('📝 You:', event.text);
  });

  client.on(EventType.AI_RESPONSE_RECEIVED, (event) => {
    console.log('🤖 AI:', event.text);
  });

  client.on(EventType.ERROR, (event) => {
    console.error('❌ Error:', event.message);
  });

  try {
    await client.connect();
    
    process.on('SIGINT', async () => {
      await client.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}

startVoiceChat();
```

## Framework Integration

### React

```typescript
import { useEffect, useState } from 'react';
import { ModoVoiceClient, EventType } from '@modochats/voice-client';

function VoiceChat() {
  const [client] = useState(() => new ModoVoiceClient({
    apiBase: 'https://live.modochats.com',
    chatbotUuid: 'your-chatbot-uuid',
    userUniqueId: 'user-12345'
  }));
  
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    client.on(EventType.CONNECTED, () => setIsConnected(true));
    client.on(EventType.DISCONNECTED, () => setIsConnected(false));

    return () => {
      client.disconnect();
    };
  }, [client]);

  return (
    <div>
      <button onClick={() => client.connect()}>
        Connect
      </button>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
    </div>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ModoVoiceClient, EventType } from '@modochats/voice-client';

const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-chatbot-uuid',
  userUniqueId: 'user-12345'
});

const isConnected = ref(false);

onMounted(() => {
  client.on(EventType.CONNECTED, () => isConnected.value = true);
  client.on(EventType.DISCONNECTED, () => isConnected.value = false);
});

onUnmounted(() => {
  client.disconnect();
});
</script>

<template>
  <div>
    <button @click="client.connect()">Connect</button>
    <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
  </div>
</template>
```

## Common Use Cases

### 1. Show Voice Activity

```typescript
client.on(EventType.VOICE_METRICS, (event) => {
  const level = event.db;
  const isActive = event.isActive;
  
  updateVoiceIndicator(level, isActive);
});
```

### 2. Display Transcript in Real-Time

```typescript
client.on(EventType.TRANSCRIPT_RECEIVED, (event) => {
  document.getElementById('transcript').textContent = event.text;
});
```

### 3. Show AI Response

```typescript
client.on(EventType.AI_RESPONSE_RECEIVED, (event) => {
  document.getElementById('ai-response').textContent = event.text;
});
```

### 4. Handle Connection Errors

```typescript
client.on(EventType.CONNECTION_ERROR, (event) => {
  alert(`Connection failed: ${event.message}`);
});
```

### 5. Select Microphone

```typescript
const devices = await client.getAvailableDevices();

devices.forEach(device => {
  const option = document.createElement('option');
  option.value = device.deviceId;
  option.textContent = device.label;
  select.appendChild(option);
});

await client.connect(selectedDeviceId);
```

### 6. Monitor Connection Metrics

```typescript
setInterval(() => {
  const metrics = client.getConnectionMetrics();
  console.log('Duration:', metrics.duration);
  console.log('Bytes sent:', metrics.bytesSent);
  console.log('Bytes received:', metrics.bytesReceived);
}, 5000);
```

## Configuration

### Basic Configuration

```typescript
const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-uuid',
  userUniqueId: 'user-id'
});
```

### With Custom Audio Settings

```typescript
const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-uuid',
  userUniqueId: 'user-id',
  audio: {
    constraints: {
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true
    }
  }
});
```

### With Logging

```typescript
import { LogLevel } from '@modochats/voice-client';

const client = new ModoVoiceClient({
  apiBase: 'https://live.modochats.com',
  chatbotUuid: 'your-uuid',
  userUniqueId: 'user-id',
  logging: {
    level: LogLevel.DEBUG,
    enableConsole: true
  }
});
```

## Error Handling

### Handle All Errors

```typescript
client.on(EventType.ERROR, (event) => {
  console.error('Error:', event.message);
  if (event.context) {
    console.error('Context:', event.context);
  }
});

client.on(EventType.CONNECTION_ERROR, (event) => {
  console.error('Connection error:', event.message);
});

client.on(EventType.AI_PLAYBACK_ERROR, (event) => {
  console.error('Playback error:', event.message);
});
```

### Graceful Degradation

```typescript
try {
  await client.connect();
} catch (error) {
  if (error.name === 'NotAllowedError') {
    alert('Microphone access denied. Please allow microphone access.');
  } else if (error.name === 'NotFoundError') {
    alert('No microphone found. Please connect a microphone.');
  } else {
    alert('Failed to connect. Please try again.');
  }
}
```

## Best Practices

### 1. Always Clean Up

```typescript
window.addEventListener('beforeunload', () => {
  client.disconnect();
});
```

### 2. Check Connection Status

```typescript
if (client.isConnected()) {
  await client.disconnect();
}
await client.connect();
```

### 3. Use Unsubscribe Functions

```typescript
const unsubscribe = client.on(EventType.VOICE_METRICS, handler);

cleanup() {
  unsubscribe();
}
```

### 4. Monitor Voice Activity

```typescript
let silenceTimer: NodeJS.Timeout;

client.on(EventType.VOICE_DETECTED, () => {
  clearTimeout(silenceTimer);
  showSpeakingIndicator();
});

client.on(EventType.VOICE_ENDED, () => {
  silenceTimer = setTimeout(() => {
    hideSpeakingIndicator();
  }, 1000);
});
```

### 5. Handle Reconnection

```typescript
client.on(EventType.DISCONNECTED, (event) => {
  if (!event.wasClean) {
    setTimeout(() => {
      client.connect();
    }, 5000);
  }
});
```

## Troubleshooting

### Microphone Not Working

1. Check browser permissions
2. Verify microphone is connected
3. Try selecting a different device
4. Check console for errors

### No Audio Playback

1. Check speaker/headphone connection
2. Verify volume is not muted
3. Check browser audio permissions
4. Look for playback errors in console

### Connection Issues

1. Verify API base URL
2. Check chatbot UUID is valid
3. Ensure network connectivity
4. Check for firewall/proxy issues

### High Latency

1. Reduce `minBufferSize` in audio config
2. Decrease `targetChunks`
3. Check network latency
4. Consider using a closer server

## Next Steps

- Read the [API Documentation](API.md) for detailed API reference
- Check out [examples/](examples/) for more code samples
- Review [Configuration](README.md#configuration) for advanced options
- Join our community for support

## Support

Need help? Contact us:

- 📧 Email: support@modochats.com
- 💬 Discord: https://discord.gg/modochats
- 📖 Docs: https://docs.modochats.com
- 🐛 Issues: https://github.com/modochats/voice-client/issues

Happy coding! 🎉

