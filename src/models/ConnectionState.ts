import { ConnectionState as State, ConnectionMetrics, WebSocketError } from '../types/websocket';

export class ConnectionState {
  private state: State = State.DISCONNECTED;
  private metrics: ConnectionMetrics = {
    duration: 0,
    reconnectAttempts: 0,
    bytesSent: 0,
    bytesReceived: 0,
    messagesSent: 0,
    messagesReceived: 0
  };
  
  private lastError: WebSocketError | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  getState(): State {
    return this.state;
  }

  setState(state: State): void {
    this.state = state;
    
    if (state === State.CONNECTED) {
      this.metrics.connectedAt = Date.now();
      this.metrics.reconnectAttempts = 0;
    } else if (state === State.DISCONNECTED && this.metrics.connectedAt) {
      this.metrics.disconnectedAt = Date.now();
      this.metrics.duration = this.metrics.disconnectedAt - this.metrics.connectedAt;
    }
  }

  isConnected(): boolean {
    return this.state === State.CONNECTED;
  }

  isConnecting(): boolean {
    return this.state === State.CONNECTING;
  }

  isDisconnected(): boolean {
    return this.state === State.DISCONNECTED;
  }

  isDisconnecting(): boolean {
    return this.state === State.DISCONNECTING;
  }

  hasError(): boolean {
    return this.state === State.ERROR;
  }

  getMetrics(): ConnectionMetrics {
    const current = { ...this.metrics };
    if (this.metrics.connectedAt && !this.metrics.disconnectedAt) {
      current.duration = Date.now() - this.metrics.connectedAt;
    }
    return current;
  }

  incrementReconnectAttempts(): void {
    this.metrics.reconnectAttempts++;
  }

  getReconnectAttempts(): number {
    return this.metrics.reconnectAttempts;
  }

  resetReconnectAttempts(): void {
    this.metrics.reconnectAttempts = 0;
  }

  addBytesSent(bytes: number): void {
    this.metrics.bytesSent += bytes;
  }

  addBytesReceived(bytes: number): void {
    this.metrics.bytesReceived += bytes;
  }

  incrementMessagesSent(): void {
    this.metrics.messagesSent++;
  }

  incrementMessagesReceived(): void {
    this.metrics.messagesReceived++;
  }

  setLastError(error: WebSocketError): void {
    this.lastError = error;
    this.state = State.ERROR;
  }

  getLastError(): WebSocketError | null {
    return this.lastError;
  }

  clearError(): void {
    this.lastError = null;
    if (this.state === State.ERROR) {
      this.state = State.DISCONNECTED;
    }
  }

  setReconnectTimer(timer: NodeJS.Timeout): void {
    this.clearReconnectTimer();
    this.reconnectTimer = timer;
  }

  clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  reset(): void {
    this.state = State.DISCONNECTED;
    this.metrics = {
      duration: 0,
      reconnectAttempts: 0,
      bytesSent: 0,
      bytesReceived: 0,
      messagesSent: 0,
      messagesReceived: 0
    };
    this.lastError = null;
    this.clearReconnectTimer();
  }

  getDuration(): number {
    if (this.metrics.connectedAt) {
      const end = this.metrics.disconnectedAt || Date.now();
      return end - this.metrics.connectedAt;
    }
    return 0;
  }
}

