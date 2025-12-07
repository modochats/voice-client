import { ModoVoiceConfig } from '../types/config';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateConfig(config: ModoVoiceConfig): void {
  if (!config.chatbotUuid || typeof config.chatbotUuid !== 'string') {
    throw new ValidationError('chatbotUuid is required and must be a string');
  }

  if (!config.userUniqueId || typeof config.userUniqueId !== 'string') {
    throw new ValidationError('userUniqueId is required and must be a string');
  }

  if (!config.apiBase || typeof config.apiBase !== 'string') {
    throw new ValidationError('apiBase is required and must be a string');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(config.chatbotUuid)) {
    throw new ValidationError('chatbotUuid must be a valid UUID');
  }

  if (config.audio) {
    validateAudioConfig(config.audio);
  }

  if (config.websocket) {
    validateWebSocketConfig(config.websocket);
  }

  if (config.logging) {
    validateLoggingConfig(config.logging);
  }
}

function validateAudioConfig(config: Partial<ModoVoiceConfig['audio']>): void {
  if (!config) return;
  if (config.constraints) {
    if (config.constraints.sampleRate && config.constraints.sampleRate < 8000) {
      throw new ValidationError('sampleRate must be at least 8000');
    }
    if (config.constraints.channelCount && config.constraints.channelCount < 1) {
      throw new ValidationError('channelCount must be at least 1');
    }
  }

  if (config.processor) {
    if (config.processor.voiceThreshold !== undefined && 
        (config.processor.voiceThreshold < 0 || config.processor.voiceThreshold > 1)) {
      throw new ValidationError('voiceThreshold must be between 0 and 1');
    }
    if (config.processor.silenceThreshold !== undefined && 
        (config.processor.silenceThreshold < 0 || config.processor.silenceThreshold > 1)) {
      throw new ValidationError('silenceThreshold must be between 0 and 1');
    }
  }
}

function validateWebSocketConfig(config: Partial<ModoVoiceConfig['websocket']>): void {
  if (!config) return;
  if (config.maxReconnectAttempts !== undefined && config.maxReconnectAttempts < 0) {
    throw new ValidationError('maxReconnectAttempts must be non-negative');
  }

  if (config.reconnectDelay !== undefined && config.reconnectDelay < 0) {
    throw new ValidationError('reconnectDelay must be non-negative');
  }

  if (config.connectionTimeout !== undefined && config.connectionTimeout < 1000) {
    throw new ValidationError('connectionTimeout must be at least 1000ms');
  }
}

function validateLoggingConfig(config: Partial<ModoVoiceConfig['logging']>): void {
  if (!config) return;
  if (config.level !== undefined && (config.level < 0 || config.level > 4)) {
    throw new ValidationError('log level must be between 0 and 4');
  }
}

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input.trim().slice(0, maxLength);
}

export function validateDeviceId(deviceId: string): boolean {
  return deviceId === 'default' || /^[a-zA-Z0-9_-]+$/.test(deviceId);
}

