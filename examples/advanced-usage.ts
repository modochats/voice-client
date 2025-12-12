import {ModoVoiceClient, EventType, LogLevel} from "../src";

async function main() {
  const client = new ModoVoiceClient({
    apiBase: "https://live.modochats.com",
    chatbotUuid: "your-chatbot-uuid-here",
    userUniqueId: "user-123",

    audio: {
      constraints: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
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
    }
  });

  let conversationCount = 0;

  client.on(EventType.CONNECTED, event => {
    console.log("✅ Connected");
    console.log(`   Chatbot: ${event.chatbotUuid}`);
    console.log(`   User: ${event.userUniqueId}`);
    console.log(`   Time: ${new Date(event.timestamp).toISOString()}`);
  });

  client.on(EventType.DISCONNECTED, event => {
    console.log("❌ Disconnected");
    if (event.reason) console.log(`   Reason: ${event.reason}`);
    if (event.code) console.log(`   Code: ${event.code}`);

    const metrics = client.getConnectionMetrics();
    console.log("\n📊 Connection Metrics:");
    console.log(`   Duration: ${(metrics.duration / 1000).toFixed(2)}s`);
    console.log(`   Messages Sent: ${metrics.messagesSent}`);
    console.log(`   Messages Received: ${metrics.messagesReceived}`);
    console.log(`   Bytes Sent: ${formatBytes(metrics.bytesSent)}`);
    console.log(`   Bytes Received: ${formatBytes(metrics.bytesReceived)}`);
    console.log(`   Reconnect Attempts: ${metrics.reconnectAttempts}`);
  });

  client.on(EventType.TURN_CHANGED, event => {
    console.log(`🔄 Turn changed to: ${event.turn}`);
    conversationCount++;
  });

  client.on(EventType.AI_PLAYBACK_CHUNK, event => {
    process.stdout.write(`\r🔊 Playing: ${formatBytes(event.totalReceived)} received   `);
  });

  client.on(EventType.MICROPHONE_PAUSED, () => {
    console.log("⏸ Microphone paused (AI speaking)");
  });

  client.on(EventType.MICROPHONE_RESUMED, () => {
    console.log("▶️ Microphone resumed (Your turn)");
  });

  client.on(EventType.ERROR, event => {
    console.error(`❌ Error: ${event.message}`);
    if (event.context) console.error(`   Context: ${event.context}`);
  });

  client.onAny(event => {
    if (event.type === EventType.DEBUG) {
      console.debug(`[DEBUG] ${event.message}`, event.data || "");
    }
  });

  try {
    console.log("🔍 Detecting audio devices...");
    const devices = await client.getAvailableDevices();
    console.log(`\n📱 Available Devices (${devices.length}):`);
    devices.forEach((device, i) => {
      console.log(`   ${i + 1}. ${device.label} (${device.deviceId.slice(0, 8)}...)`);
    });

    console.log("\n🔌 Connecting...");
    await client.connect(devices[0]?.deviceId);

    console.log("\n✨ Ready! Start speaking...");
    console.log("📊 Real-time metrics will be displayed");
    console.log("Press Ctrl+C to disconnect\n");

    process.on("SIGINT", async () => {
      console.log("\n\n👋 Shutting down...");
      console.log(`📈 Total conversations: ${conversationCount}`);
      await client.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

main();
