import { ModoVoiceClient, EventType, LogLevel } from '../src';

async function main() {
  const client = new ModoVoiceClient({
    apiBase: 'https://live.modochats.com',
    chatbotUuid: 'your-chatbot-uuid-here',
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
        voiceThreshold: 0.3,
        silenceThreshold: 0.15,
        minSilenceFrames: 10,
        maxPreRollBuffers: 5,
        sampleRate: 16000
      },
      minBufferSize: 50000,
      targetChunks: 25,
      resumeDelay: 300
    },
    
    websocket: {
      reconnect: true,
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      reconnectBackoffMultiplier: 2,
      maxReconnectDelay: 60000,
      pingInterval: 20000,
      connectionTimeout: 15000
    },
    
    logging: {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableEvents: true,
      includeTimestamp: true,
      includeContext: true,
      customLogger: (level, message, context, data) => {
        const timestamp = new Date().toISOString();
        const levelStr = ['NONE', 'ERROR', 'WARN', 'INFO', 'DEBUG'][level];
        console.log(`[${timestamp}] [${levelStr}] [${context || 'SDK'}] ${message}`, data || '');
      }
    },
    
    features: {
      enableVAD: true,
      enableNoiseReduction: true,
      enableEchoCancellation: true,
      enableAutoGainControl: true,
      enableOnHoldAudio: true,
      enablePreRollBuffer: true,
      enableMetrics: true,
      metricsInterval: 500,
      enableDebugLogs: true
    }
  });

  let voiceStartTime: number = 0;
  let conversationCount = 0;

  client.on(EventType.CONNECTED, (event) => {
    console.log('✅ Connected');
    console.log(`   Chatbot: ${event.chatbotUuid}`);
    console.log(`   User: ${event.userUniqueId}`);
    console.log(`   Time: ${new Date(event.timestamp).toISOString()}`);
  });

  client.on(EventType.DISCONNECTED, (event) => {
    console.log('❌ Disconnected');
    if (event.reason) console.log(`   Reason: ${event.reason}`);
    if (event.code) console.log(`   Code: ${event.code}`);
    
    const metrics = client.getConnectionMetrics();
    console.log('\n📊 Connection Metrics:');
    console.log(`   Duration: ${(metrics.duration / 1000).toFixed(2)}s`);
    console.log(`   Messages Sent: ${metrics.messagesSent}`);
    console.log(`   Messages Received: ${metrics.messagesReceived}`);
    console.log(`   Bytes Sent: ${formatBytes(metrics.bytesSent)}`);
    console.log(`   Bytes Received: ${formatBytes(metrics.bytesReceived)}`);
    console.log(`   Reconnect Attempts: ${metrics.reconnectAttempts}`);
  });

  client.on(EventType.VOICE_DETECTED, (event) => {
    voiceStartTime = Date.now();
    console.log(`🎤 Voice detected: RMS=${event.rms.toFixed(4)}, dB=${event.db.toFixed(1)}`);
  });

  client.on(EventType.VOICE_ENDED, (event) => {
    const duration = event.duration;
    console.log(`⏹ Voice ended: Duration=${duration}ms`);
  });

  client.on(EventType.VOICE_METRICS, (event) => {
    if (event.isActive) {
      process.stdout.write(`\r🎤 Recording: RMS=${event.rms.toFixed(4)}, dB=${event.db.toFixed(1)} dB   `);
    }
  });

  client.on(EventType.TRANSCRIPT_RECEIVED, (event) => {
    console.log(`\n📝 Transcript: "${event.text}"`);
  });

  client.on(EventType.AI_RESPONSE_RECEIVED, (event) => {
    console.log(`💬 AI Response: "${event.text}"`);
    conversationCount++;
  });

  client.on(EventType.AI_PLAYBACK_STARTED, () => {
    console.log('🔊 AI playback started');
  });

  client.on(EventType.AI_PLAYBACK_CHUNK, (event) => {
    process.stdout.write(`\r🔊 Playing: ${formatBytes(event.totalReceived)} received   `);
  });

  client.on(EventType.AI_PLAYBACK_COMPLETED, (event) => {
    console.log(`\n✅ Playback completed: ${formatBytes(event.totalBytes)} in ${event.duration}ms`);
  });

  client.on(EventType.MICROPHONE_PAUSED, () => {
    console.log('⏸ Microphone paused (AI speaking)');
  });

  client.on(EventType.MICROPHONE_RESUMED, () => {
    console.log('▶️ Microphone resumed (Your turn)');
  });

  client.on(EventType.ERROR, (event) => {
    console.error(`❌ Error: ${event.message}`);
    if (event.context) console.error(`   Context: ${event.context}`);
  });

  client.onAny((event) => {
    if (event.type === EventType.DEBUG) {
      console.debug(`[DEBUG] ${event.message}`, event.data || '');
    }
  });

  try {
    console.log('🔍 Detecting audio devices...');
    const devices = await client.getAvailableDevices();
    console.log(`\n📱 Available Devices (${devices.length}):`);
    devices.forEach((device, i) => {
      console.log(`   ${i + 1}. ${device.label} (${device.deviceId.slice(0, 8)}...)`);
    });

    console.log('\n🔌 Connecting...');
    await client.connect(devices[0]?.deviceId);

    console.log('\n✨ Ready! Start speaking...');
    console.log('📊 Real-time metrics will be displayed');
    console.log('Press Ctrl+C to disconnect\n');

    setInterval(() => {
      const voiceMetrics = client.getVoiceMetrics();
      if (!voiceMetrics.isActive && !voiceMetrics.isPaused) {
        process.stdout.write(`\r⏸ Silent: Noise Floor=${voiceMetrics.noiseFloor.toFixed(4)}   `);
      }
    }, 100);

    process.on('SIGINT', async () => {
      console.log('\n\n👋 Shutting down...');
      console.log(`📈 Total conversations: ${conversationCount}`);
      await client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

main();

