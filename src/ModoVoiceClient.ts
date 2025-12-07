import {EventEmitter} from "./services/emitter/event-emitter";
import {WebSocketService} from "./services/web-socket/service";
import {AudioService} from "./services/audio/service";
import {AudioState} from "./services/audio/audio-state";
import {Logger, createLogger} from "./utils/logger";
import {validateConfig} from "./utils/validators";
import {ModoVoiceConfig, DEFAULT_CONFIG, LogLevel} from "./types/config";
import {EventType, EventListener, ModoVoiceEvent} from "./types/events";
import {AudioDeviceInfo} from "./services/audio/audio";
import {ConnectionMetrics} from "./services/web-socket/websocket";
import {ConnectionState} from "./models";

export class ModoVoiceClient {
  private config: Required<ModoVoiceConfig>;

  private eventEmitter: EventEmitter;
  private audioState: AudioState;
  private connectionState: ConnectionState;
  private logger: Logger;

  private webSocketService: WebSocketService;
  private audioService: AudioService;

  private initialized: boolean = false;

  constructor(config: ModoVoiceConfig) {
    validateConfig(config);

    this.config = this.mergeWithDefaults(config);

    this.eventEmitter = new EventEmitter();
    this.audioState = new AudioState();
    this.connectionState = new ConnectionState();
    this.logger = createLogger(this.config.logging as any, this.eventEmitter);

    this.webSocketService = new WebSocketService(
      {
        url: this.config.apiBase,
        chatbotUuid: this.config.chatbotUuid,
        userUniqueId: this.config.userUniqueId,
        ...this.config.websocket
      },
      this.eventEmitter,
      this.connectionState
    );

    this.audioService = new AudioService(this.eventEmitter, this.audioState, this.config.audio as any);

    // Set up microphone audio transmission to WebSocket
    this.audioService.setSendAudioCallback((audioData: Uint8Array) => {
      if (this.webSocketService.isConnected()) {
        try {
          this.webSocketService.send(audioData);
        } catch (error) {
          this.logger.error("Failed to send audio data", "ModoVoiceClient", error);
        }
      }
    });

    this.setupInternalListeners();
  }

  private mergeWithDefaults(config: ModoVoiceConfig): Required<ModoVoiceConfig> {
    return {
      apiBase: config.apiBase,
      chatbotUuid: config.chatbotUuid,
      userUniqueId: config.userUniqueId,
      audio: {...DEFAULT_CONFIG.audio, ...config.audio} as any,
      websocket: {...DEFAULT_CONFIG.websocket, ...config.websocket} as any,
      logging: {...DEFAULT_CONFIG.logging, ...config.logging} as any,
      features: {...DEFAULT_CONFIG.features, ...config.features} as any
    };
  }

  private setupInternalListeners(): void {
    // Route audio chunks from WebSocket to AudioService for playback
    this.eventEmitter.on(EventType.AI_PLAYBACK_CHUNK, async event => {
      if ("data" in event && event.data instanceof Uint8Array) {
        await this.audioService.handleIncomingAudioChunk(event.data.buffer as ArrayBuffer);
        this.logger.debug(`Received audio chunk: ${event.data.byteLength} bytes`, "ModoVoiceClient");
      }
    });

    // Handle microphone control from server (pause when AI speaks, resume when user's turn)
    this.eventEmitter.on(EventType.MICROPHONE_PAUSED, async () => {
      await this.audioService.pauseMicrophone();
      this.logger.debug("Microphone paused", "ModoVoiceClient");
    });

    this.eventEmitter.on(EventType.MICROPHONE_RESUMED, async () => {
      await this.audioService.resumeMicrophone();
      this.logger.debug("Microphone resumed", "ModoVoiceClient");
    });

    // Handle turn changes from server
    this.eventEmitter.on(EventType.TURN_CHANGED, async event => {
      this.logger.debug(`Turn changed to: ${event.turn}`, "ModoVoiceClient");
    });
  }

  async connect(deviceId?: string): Promise<void> {
    if (this.connectionState.isConnected()) {
      this.logger.warn("Already connected", "ModoVoiceClient");
      return;
    }

    try {
      this.logger.info("Connecting to Modo Voice Agent...", "ModoVoiceClient");

      await this.audioService.initialize(deviceId);
      this.initialized = true;

      await this.webSocketService.connect();

      this.logger.info("Successfully connected", "ModoVoiceClient");
    } catch (error) {
      this.logger.error("Connection failed", "ModoVoiceClient", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connectionState.isConnected()) {
      this.logger.warn("Not connected", "ModoVoiceClient");
      return;
    }

    try {
      this.logger.info("Disconnecting...", "ModoVoiceClient");

      this.webSocketService.disconnect();
      await this.audioService.cleanup();

      this.initialized = false;

      this.logger.info("Successfully disconnected", "ModoVoiceClient");
    } catch (error) {
      this.logger.error("Disconnect failed", "ModoVoiceClient", error);
      throw error;
    }
  }

  on<T extends EventType>(eventType: T, listener: EventListener<Extract<ModoVoiceEvent, {type: T}>>): () => void {
    return this.eventEmitter.on(eventType, listener);
  }

  once<T extends EventType>(eventType: T, listener: EventListener<Extract<ModoVoiceEvent, {type: T}>>): () => void {
    return this.eventEmitter.once(eventType, listener);
  }

  off<T extends EventType>(eventType: T, listener: EventListener<Extract<ModoVoiceEvent, {type: T}>>): void {
    this.eventEmitter.off(eventType, listener);
  }

  onAny(listener: EventListener): () => void {
    return this.eventEmitter.onAny(listener);
  }

  offAny(listener: EventListener): void {
    this.eventEmitter.offAny(listener);
  }

  isConnected(): boolean {
    return this.connectionState.isConnected();
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConnectionMetrics(): ConnectionMetrics {
    return this.connectionState.getMetrics();
  }

  async getAvailableDevices(): Promise<AudioDeviceInfo[]> {
    return this.audioService.getAvailableDevices();
  }

  setLogLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }

  getConfig(): Required<ModoVoiceConfig> {
    return {...this.config};
  }

  updateConfig(updates: Partial<ModoVoiceConfig>): void {
    if (this.connectionState.isConnected()) {
      throw new Error("Cannot update config while connected");
    }

    this.config = this.mergeWithDefaults({...this.config, ...updates});

    if (updates.logging) {
      this.logger.updateConfig(updates.logging);
    }
  }
}
