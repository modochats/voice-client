import { EventEmitter } from './services/EventEmitter';
import { WebSocketService } from './services/WebSocketService';
import { AudioService } from './services/AudioService';
import { AudioState } from './models/AudioState';
import { ConnectionState } from './models/ConnectionState';
import { VoiceMetrics } from './models/VoiceMetrics';
import { Logger, createLogger } from './utils/logger';
import { validateConfig } from './utils/validators';
import { ModoVoiceConfig, DEFAULT_CONFIG, LogLevel } from './types/config';
import { EventType, EventListener, ModoVoiceEvent } from './types/events';
import { AudioDeviceInfo, AudioPlaybackState } from './types/audio';
import { ConnectionMetrics } from './types/websocket';

export class ModoVoiceClient {
  private config: Required<ModoVoiceConfig>;
  
  private eventEmitter: EventEmitter;
  private audioState: AudioState;
  private connectionState: ConnectionState;
  private voiceMetrics: VoiceMetrics;
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
    this.voiceMetrics = new VoiceMetrics();
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
    
    this.audioService = new AudioService(
      this.eventEmitter,
      this.audioState,
      this.voiceMetrics,
      this.config.audio as any
    );
    
    this.setupInternalListeners();
  }

  private mergeWithDefaults(config: ModoVoiceConfig): Required<ModoVoiceConfig> {
    return {
      apiBase: config.apiBase,
      chatbotUuid: config.chatbotUuid,
      userUniqueId: config.userUniqueId,
      audio: { ...DEFAULT_CONFIG.audio, ...config.audio } as any,
      websocket: { ...DEFAULT_CONFIG.websocket, ...config.websocket } as any,
      logging: { ...DEFAULT_CONFIG.logging, ...config.logging } as any,
      features: { ...DEFAULT_CONFIG.features, ...config.features } as any
    };
  }

  private setupInternalListeners(): void {
    // Route audio chunks from WebSocket to AudioService for playback
    this.eventEmitter.on(EventType.AI_PLAYBACK_CHUNK, async (event) => {
      if ('data' in event && event.data instanceof Uint8Array) {
        await this.audioService.handleIncomingAudioChunk(event.data.buffer as ArrayBuffer);
        this.logger.debug(`Received audio chunk: ${event.data.byteLength} bytes`, 'AudioService');
      }
    });

    this.eventEmitter.on(EventType.AI_PLAYBACK_STARTED, async () => {
      await this.audioService.pauseMicrophone();
      this.logger.debug('Microphone paused during AI playback', 'ModoVoiceClient');
    });

    // Route user audio from microphone to WebSocket
    this.eventEmitter.on(EventType.USER_RECORDING_DATA, async (event) => {
      if ('data' in event && this.webSocketService.isConnected()) {
        try {
          this.webSocketService.send(event.data);
        } catch (error) {
          this.logger.error('Failed to send audio data', 'WebSocketService', error);
        }
      }
    });

    // Route audio complete signal to AudioService
    this.eventEmitter.on(EventType.AI_PLAYBACK_COMPLETED, async () => {
      await this.audioService.setStreamComplete();
    });

    // Handle clear buffer command from server (stop current playback, clear buffer)
    this.eventEmitter.on(EventType.CLEAR_BUFFER, async () => {
      this.audioState.clearBuffer();
      this.audioState.setStreamingComplete(false);
      this.audioState.setPlaybackState(AudioPlaybackState.IDLE);
      // Stop currently playing audio if any
      const currentAudio = this.audioState.getCurrentAudioElement();
      if (currentAudio) {
        try {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        } catch (e) {
          // Ignore errors
        }
        this.audioState.setCurrentAudioElement(null);
      }
    });

    // Handle microphone control from server (pause when AI speaks)
    this.eventEmitter.on(EventType.MICROPHONE_PAUSED, async (event) => {
      // Only pause if this is from server, not from internal call
      if (!('internal' in event)) {
        await this.audioService.pauseMicrophone();
      }
    });

    this.eventEmitter.on(EventType.MICROPHONE_RESUMED, async (event) => {
      // Only resume if this is from server, not from internal call
      if (!('internal' in event)) {
        await this.audioService.resumeMicrophone();
      }
    });
  }

  async connect(deviceId?: string): Promise<void> {
    if (this.connectionState.isConnected()) {
      this.logger.warn('Already connected', 'ModoVoiceClient');
      return;
    }

    try {
      this.logger.info('Connecting to Modo Voice Agent...', 'ModoVoiceClient');
      
      await this.audioService.initialize(deviceId);
      this.initialized = true;
      
      await this.webSocketService.connect();
      
      this.logger.info('Successfully connected', 'ModoVoiceClient');
    } catch (error) {
      this.logger.error('Connection failed', 'ModoVoiceClient', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connectionState.isConnected()) {
      this.logger.warn('Not connected', 'ModoVoiceClient');
      return;
    }

    try {
      this.logger.info('Disconnecting...', 'ModoVoiceClient');
      
      this.webSocketService.disconnect();
      await this.audioService.cleanup();
      
      this.initialized = false;
      
      this.logger.info('Successfully disconnected', 'ModoVoiceClient');
    } catch (error) {
      this.logger.error('Disconnect failed', 'ModoVoiceClient', error);
      throw error;
    }
  }

  on<T extends EventType>(
    eventType: T, 
    listener: EventListener<Extract<ModoVoiceEvent, { type: T }>>
  ): () => void {
    return this.eventEmitter.on(eventType, listener);
  }

  once<T extends EventType>(
    eventType: T, 
    listener: EventListener<Extract<ModoVoiceEvent, { type: T }>>
  ): () => void {
    return this.eventEmitter.once(eventType, listener);
  }

  off<T extends EventType>(
    eventType: T, 
    listener: EventListener<Extract<ModoVoiceEvent, { type: T }>>
  ): void {
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

  getVoiceMetrics() {
    return this.voiceMetrics.getCurrent();
  }

  async getAvailableDevices(): Promise<AudioDeviceInfo[]> {
    return this.audioService.getAvailableDevices();
  }

  setLogLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }

  getConfig(): Required<ModoVoiceConfig> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<ModoVoiceConfig>): void {
    if (this.connectionState.isConnected()) {
      throw new Error('Cannot update config while connected');
    }
    
    this.config = this.mergeWithDefaults({ ...this.config, ...updates });
    
    if (updates.logging) {
      this.logger.updateConfig(updates.logging);
    }
  }
}

