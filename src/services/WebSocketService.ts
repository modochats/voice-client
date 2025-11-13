import {EventEmitter} from "./EventEmitter";
import {ConnectionState as ConnState} from "../models/ConnectionState";
import {WebSocketConfig, IncomingMessage, WebSocketMessageType, ConnectionState as State} from "../types/websocket";
import {EventType} from "../types/events";

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private eventEmitter: EventEmitter;
  private connectionState: ConnState;

  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempt: number = 0;
  private intentionalDisconnect: boolean = false;

  constructor(config: WebSocketConfig, eventEmitter: EventEmitter, connectionState: ConnState) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.connectionState = connectionState;
  }

  async connect(): Promise<void> {
    if (this.connectionState.isConnected() || this.connectionState.isConnecting()) {
      return;
    }

    // Reset intentional disconnect flag when connecting
    this.intentionalDisconnect = false;

    this.connectionState.setState(State.CONNECTING);

    try {
      const url = this.buildWebSocketURL();
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";

      await this.setupWebSocket();
    } catch (error) {
      this.connectionState.setState(State.ERROR);
      await this.eventEmitter.emit({
        type: EventType.CONNECTION_ERROR,
        timestamp: Date.now(),
        error: error as Error,
        message: (error as Error).message
      });
      throw error;
    }
  }

  private buildWebSocketURL(): string {
    const protocol = this.config.url.startsWith("https") ? "wss" : "ws";
    const host = this.config.url.replace(/^https?:\/\//, "");
    const params = new URLSearchParams({
      chatbot_uuid: this.config.chatbotUuid,
      user_unique_id: this.config.userUniqueId
    });
    return `${protocol}://${host}/ws/modo-live?${params.toString()}`;
  }

  private setupWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error("WebSocket not initialized"));
        return;
      }

      const connectionTimeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
        this.disconnect();
      }, this.config.connectionTimeout || 10000);

      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        this.connectionState.setState(State.CONNECTED);
        this.connectionState.resetReconnectAttempts();
        this.startPingInterval();

        this.eventEmitter.emit({
          type: EventType.CONNECTED,
          timestamp: Date.now(),
          chatbotUuid: this.config.chatbotUuid,
          userUniqueId: this.config.userUniqueId
        });

        resolve();
      };

      this.ws.onerror = event => {
        clearTimeout(connectionTimeout);
        this.eventEmitter.emit({
          type: EventType.ERROR,
          timestamp: Date.now(),
          error: new Error("WebSocket error"),
          message: "WebSocket connection error"
        });
        reject(new Error("WebSocket connection error"));
      };

      this.ws.onmessage = event => {
        this.handleMessage(event);
      };

      this.ws.onclose = event => {
        clearTimeout(connectionTimeout);
        this.handleClose(event);
      };
    });
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    this.connectionState.incrementMessagesReceived();

    if (event.data instanceof ArrayBuffer) {
      this.connectionState.addBytesReceived(event.data.byteLength);
      await this.handleBinaryMessage(event.data);
    } else if (typeof event.data === "string") {
      try {
        const message: IncomingMessage = JSON.parse(event.data);
        await this.handleTextMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    }
  }

  private async handleBinaryMessage(data: ArrayBuffer): Promise<void> {
    await this.eventEmitter.emit({
      type: EventType.AI_PLAYBACK_CHUNK,
      timestamp: Date.now(),
      data: new Uint8Array(data),
      size: data.byteLength,
      totalReceived: this.connectionState.getMetrics().bytesReceived
    });
  }

  private async handleTextMessage(message: IncomingMessage): Promise<void> {
    switch (message.type) {
      case WebSocketMessageType.AUDIO_COMPLETE:
        await this.eventEmitter.emit({
          type: EventType.AI_PLAYBACK_COMPLETED,
          timestamp: Date.now(),
          totalBytes: this.connectionState.getMetrics().bytesReceived,
          duration: 0
        });
        break;

      case WebSocketMessageType.PAUSE_INPUT:
        await this.eventEmitter.emit({
          type: EventType.MICROPHONE_PAUSED,
          timestamp: Date.now()
        });
        break;

      case WebSocketMessageType.RESUME_INPUT:
        await this.eventEmitter.emit({
          type: EventType.MICROPHONE_RESUMED,
          timestamp: Date.now()
        });
        break;

      case WebSocketMessageType.START_ON_HOLD:
        await this.eventEmitter.emit({
          type: EventType.MICROPHONE_PAUSED,
          timestamp: Date.now()
        });
        await this.eventEmitter.emit({
          type: EventType.ON_HOLD_STARTED,
          timestamp: Date.now()
        });
        break;

      case WebSocketMessageType.STOP_ON_HOLD:
        await this.eventEmitter.emit({
          type: EventType.MICROPHONE_RESUMED,
          timestamp: Date.now()
        });
        await this.eventEmitter.emit({
          type: EventType.ON_HOLD_STOPPED,
          timestamp: Date.now()
        });
        break;

      case WebSocketMessageType.CLEAR_BUFFER:
        await this.eventEmitter.emit({
          type: EventType.CLEAR_BUFFER,
          timestamp: Date.now()
        });
        break;

      case WebSocketMessageType.STATUS:
        await this.eventEmitter.emit({
          type: EventType.INFO,
          timestamp: Date.now(),
          message: (message as any).message || "Status update",
          context: "WebSocket"
        });
        break;

      case WebSocketMessageType.CLOSE:
        const closeMessage = (message as any).message || "Server closing connection";
        console.log("👋 Server sent goodbye:", closeMessage);

        // Emit info about the goodbye message
        await this.eventEmitter.emit({
          type: EventType.INFO,
          timestamp: Date.now(),
          message: closeMessage,
          context: "WebSocket"
        });

        // Disconnect gracefully after showing goodbye message
        setTimeout(() => {
          if (this.ws) {
            // Mark as intentional to prevent reconnect
            this.intentionalDisconnect = true;
            this.ws.close(1000, closeMessage);
          }
        }, 3000); // 3 seconds to read the message
        break;

      case WebSocketMessageType.TRANSCRIPT:
        if (message.data && typeof message.data === "object" && "text" in message.data) {
          await this.eventEmitter.emit({
            type: EventType.TRANSCRIPT_RECEIVED,
            timestamp: Date.now(),
            text: (message.data as {text: string}).text,
            language: (message.data as {language?: string}).language
          });
        }
        break;

      case WebSocketMessageType.ERROR:
        if (message.data && typeof message.data === "object" && "message" in message.data) {
          await this.eventEmitter.emit({
            type: EventType.ERROR,
            timestamp: Date.now(),
            error: new Error((message.data as {message: string}).message),
            message: (message.data as {message: string}).message
          });
        }
        break;
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopPingInterval();

    this.connectionState.setLastError({
      code: event.code,
      reason: event.reason,
      timestamp: Date.now(),
      wasClean: event.wasClean
    });

    this.eventEmitter.emit({
      type: EventType.DISCONNECTED,
      timestamp: Date.now(),
      reason: event.reason,
      code: event.code
    });

    // Don't reconnect if this was an intentional disconnect
    if (!this.intentionalDisconnect && this.config.reconnect && this.reconnectAttempt < (this.config.maxReconnectAttempts || 5)) {
      this.scheduleReconnect();
    } else {
      this.connectionState.setState(State.DISCONNECTED);
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempt++;
    this.connectionState.incrementReconnectAttempts();

    const delay = this.config.reconnectDelay || 1000;

    const timer = setTimeout(() => {
      this.connect().catch(error => {
        console.error("Reconnection failed:", error);
      });
    }, delay);

    this.connectionState.setReconnectTimer(timer);
  }

  send(data: ArrayBuffer | string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    this.ws.send(data);
    this.connectionState.incrementMessagesSent();

    if (data instanceof ArrayBuffer) {
      this.connectionState.addBytesSent(data.byteLength);
    } else {
      this.connectionState.addBytesSent(new TextEncoder().encode(data).byteLength);
    }
  }

  disconnect(): void {
    if (!this.ws) return;

    // Mark this as an intentional disconnect to prevent auto-reconnect
    this.intentionalDisconnect = true;

    this.connectionState.setState(State.DISCONNECTING);
    this.stopPingInterval();
    this.connectionState.clearReconnectTimer();

    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(1000, "Client disconnect");
    }

    this.ws = null;
    this.connectionState.setState(State.DISCONNECTED);
    this.reconnectAttempt = 0;
  }

  private startPingInterval(): void {
    // Modo Voice Agent server doesn't support ping/pong messages
    // It only accepts binary audio data
    // Pings would cause disconnection, so we disable them
    return;
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}
