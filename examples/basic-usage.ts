import {ModoVoiceClient, EventType, LogLevel, AudioService, EventEmitter, AudioInputProcessor} from "../src";

async function main() {
  const client = new ModoVoiceClient({
    apiBase: "https://live.modochats.com",
    chatbotUuid: "your-chatbot-uuid-here",
    userUniqueId: "user-123",
    logging: {
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableEvents: false,
      includeTimestamp: true,
      includeContext: true
    }
  });

  client.on(EventType.CONNECTED, event => {
    console.log("✅ Connected to Modo Voice Agent");
    console.log(`   Chatbot: ${event.chatbotUuid}`);
    console.log(`   User: ${event.userUniqueId}`);
  });

  client.on(EventType.DISCONNECTED, event => {
    console.log("❌ Disconnected from Modo Voice Agent");
    if (event.reason) {
      console.log(`   Reason: ${event.reason}`);
    }
  });

  client.on(EventType.CONNECTION_ERROR, event => {
    console.error("🔴 Connection Error:", event.message);
  });

  client.on(EventType.TURN_CHANGED, event => {
    console.log(`🔄 Turn changed to: ${event.turn}`);
  });

  client.on(EventType.MICROPHONE_PAUSED, () => {
    console.log("🔇 Microphone paused");
  });

  client.on(EventType.MICROPHONE_RESUMED, () => {
    console.log("🔊 Microphone resumed");
  });

  client.on(EventType.AI_PLAYBACK_CHUNK, event => {
    console.log(`🎵 Receiving audio: ${event.size} bytes`);
  });

  try {
    console.log("🔌 Connecting to Modo Voice Agent...");
    await client.connect();

    console.log("\n✨ Connected! Start speaking...\n");
    console.log("Press Ctrl+C to disconnect\n");

    process.on("SIGINT", async () => {
      console.log("\n\n👋 Disconnecting...");
      await client.disconnect();
      console.log("✅ Disconnected successfully");
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to connect:", error);
    process.exit(1);
  }
}
main();
