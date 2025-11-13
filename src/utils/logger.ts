import { LogLevel, LoggingConfig } from '../types/config';
import { EventEmitter } from '../services/EventEmitter';
import { EventType } from '../types/events';

export class Logger {
  private config: LoggingConfig;
  private eventEmitter?: EventEmitter;

  constructor(config: LoggingConfig, eventEmitter?: EventEmitter) {
    this.config = config;
    this.eventEmitter = eventEmitter;
  }

  error(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.ERROR, message, context, data);
  }

  warn(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  info(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  debug(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (level > this.config.level) {
      return;
    }

    if (this.config.customLogger) {
      this.config.customLogger(level, message, context, data);
      return;
    }

    if (this.config.enableConsole) {
      this.logToConsole(level, message, context, data);
    }

    if (this.config.enableEvents && this.eventEmitter) {
      this.logToEvents(level, message, context, data);
    }
  }

  private logToConsole(level: LogLevel, message: string, context?: string, data?: unknown): void {
    const timestamp = this.config.includeTimestamp 
      ? `[${new Date().toISOString()}]` 
      : '';
    
    const contextStr = this.config.includeContext && context 
      ? `[${context}]` 
      : '';
    
    const prefix = [timestamp, contextStr].filter(Boolean).join(' ');
    const fullMessage = `${prefix} ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(fullMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(fullMessage, data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(fullMessage, data || '');
        break;
    }
  }

  private logToEvents(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (!this.eventEmitter) return;

    switch (level) {
      case LogLevel.ERROR:
        this.eventEmitter.emit({
          type: EventType.ERROR,
          timestamp: Date.now(),
          error: new Error(message),
          message,
          context
        });
        break;
      case LogLevel.WARN:
        this.eventEmitter.emit({
          type: EventType.WARNING,
          timestamp: Date.now(),
          message,
          context
        });
        break;
      case LogLevel.INFO:
        this.eventEmitter.emit({
          type: EventType.INFO,
          timestamp: Date.now(),
          message,
          context
        });
        break;
      case LogLevel.DEBUG:
        this.eventEmitter.emit({
          type: EventType.DEBUG,
          timestamp: Date.now(),
          message,
          data
        });
        break;
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function createLogger(config: LoggingConfig, eventEmitter?: EventEmitter): Logger {
  return new Logger(config, eventEmitter);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

