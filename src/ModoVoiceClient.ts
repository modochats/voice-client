import {EventEmitter} from "./services/emitter/event-emitter";
import {WebSocketService} from "./services/web-socket/service";
import {AudioService} from "./services/audio/service";
import {validateConfig} from "./services/shared/utils/validators";
import {ModoVoiceConfig, DEFAULT_CONFIG} from "./services/shared/types/config";
import {EventType, EventListener, ModoVoiceEvent} from "./services/shared/types/events";
import {AudioDeviceInfo} from "./services/audio/audio";
import {ConnectionMetrics} from "./services/web-socket/websocket";
import {ConnectionState} from "./services/web-socket/connection-state";

export class ModoVoiceClient {
  private config: Required<ModoVoiceConfig>;

  private eventEmitter: EventEmitter;
  private connectionState: ConnectionState;

  private webSocketService: WebSocketService;
  private audioService: AudioService;

  private initialized: boolean = false;

  constructor(config: ModoVoiceConfig) {
    validateConfig(config);

    this.config = this.mergeWithDefaults(config);

    this.eventEmitter = new EventEmitter();
    this.connectionState = new ConnectionState();

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

    this.audioService = new AudioService(this.eventEmitter, this.config.audio as any);

    // Set up microphone audio transmission to WebSocket
    this.audioService.setSendAudioCallback(base64Audio => {
      if (this.webSocketService.isConnected()) {
        try {
          this.webSocketService.send(base64Audio);
        } catch (error) {}
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
      websocket: {...DEFAULT_CONFIG.websocket, ...config.websocket} as any
    };
  }

  private setupInternalListeners(): void {
    // Route audio chunks from WebSocket to AudioService for playback
    this.eventEmitter.on(EventType.AI_PLAYBACK_CHUNK, async event => {
      if ("data" in event && event.data instanceof Uint8Array) {
        await this.audioService.handleIncomingAudioChunk(event.data);
      }
    });

    // Handle microphone control from server (pause when AI speaks, resume when user's turn)
    this.eventEmitter.on(EventType.MICROPHONE_PAUSED, async () => {
      await this.audioService.pauseMicrophone();
    });

    this.eventEmitter.on(EventType.MICROPHONE_RESUMED, async () => {
      await this.audioService.resumeMicrophone();
    });

    // Handle turn changes from server
    this.eventEmitter.on(EventType.TURN_CHANGED, async event => {});
  }

  async connect(deviceId?: string): Promise<void> {
    if (this.connectionState.isConnected()) {
      return;
    }

    try {
      await this.audioService.initialize(deviceId);
      this.initialized = true;

      await this.webSocketService.connect();
    } catch (error) {
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connectionState.isConnected()) {
      return;
    }

    try {
      this.webSocketService.disconnect();
      await this.audioService.cleanup();

      this.initialized = false;
    } catch (error) {
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

  getConfig(): Required<ModoVoiceConfig> {
    return {...this.config};
  }

  updateConfig(updates: Partial<ModoVoiceConfig>): void {
    if (this.connectionState.isConnected()) {
      throw new Error("Cannot update config while connected");
    }

    this.config = this.mergeWithDefaults({...this.config, ...updates});
  }
}
