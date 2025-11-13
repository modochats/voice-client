import { EventType, ModoVoiceEvent, EventListener, EventListenerMap } from '../types/events';

export class EventEmitter {
  private listeners: EventListenerMap = {};
  private onceListeners: EventListenerMap = {};
  private wildcardListeners: Set<EventListener> = new Set();

  on<T extends EventType>(eventType: T, listener: EventListener<Extract<ModoVoiceEvent, { type: T }>>): () => void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = new Set() as any;
    }
    (this.listeners[eventType] as any)!.add(listener);

    return () => this.off(eventType, listener);
  }

  once<T extends EventType>(eventType: T, listener: EventListener<Extract<ModoVoiceEvent, { type: T }>>): () => void {
    if (!this.onceListeners[eventType]) {
      this.onceListeners[eventType] = new Set() as any;
    }
    (this.onceListeners[eventType] as any)!.add(listener);

    return () => this.offOnce(eventType, listener);
  }

  off<T extends EventType>(eventType: T, listener: EventListener<Extract<ModoVoiceEvent, { type: T }>>): void {
    const listeners = this.listeners[eventType];
    if (listeners) {
      listeners.delete(listener as EventListener);
    }
  }

  private offOnce<T extends EventType>(eventType: T, listener: EventListener<Extract<ModoVoiceEvent, { type: T }>>): void {
    const listeners = this.onceListeners[eventType];
    if (listeners) {
      listeners.delete(listener as EventListener);
    }
  }

  onAny(listener: EventListener): () => void {
    this.wildcardListeners.add(listener);
    return () => this.offAny(listener);
  }

  offAny(listener: EventListener): void {
    this.wildcardListeners.delete(listener);
  }

  async emit(event: ModoVoiceEvent): Promise<void> {
    const regularListeners = this.listeners[event.type];
    if (regularListeners) {
      const promises = Array.from(regularListeners as any).map((listener: any) => 
        this.safeInvoke(listener, event)
      );
      await Promise.all(promises);
    }

    const onceListeners = this.onceListeners[event.type];
    if (onceListeners) {
      const listeners = Array.from(onceListeners as any);
      onceListeners.clear();
      
      const promises = listeners.map((listener: any) => 
        this.safeInvoke(listener, event)
      );
      await Promise.all(promises);
    }

    if (this.wildcardListeners.size > 0) {
      const promises = Array.from(this.wildcardListeners).map(listener => 
        this.safeInvoke(listener, event)
      );
      await Promise.all(promises);
    }
  }

  private async safeInvoke(listener: EventListener, event: ModoVoiceEvent): Promise<void> {
    try {
      await listener(event);
    } catch (error) {
      console.error(`Error in event listener for ${event.type}:`, error);
    }
  }

  removeAllListeners(eventType?: EventType): void {
    if (eventType) {
      delete this.listeners[eventType];
      delete this.onceListeners[eventType];
    } else {
      this.listeners = {};
      this.onceListeners = {};
      this.wildcardListeners.clear();
    }
  }

  listenerCount(eventType: EventType): number {
    const regular = this.listeners[eventType]?.size || 0;
    const once = this.onceListeners[eventType]?.size || 0;
    return regular + once;
  }

  hasListeners(eventType?: EventType): boolean {
    if (eventType) {
      return this.listenerCount(eventType) > 0;
    }
    return Object.keys(this.listeners).length > 0 || 
           Object.keys(this.onceListeners).length > 0 || 
           this.wildcardListeners.size > 0;
  }

  getEventTypes(): EventType[] {
    const types = new Set<EventType>();
    Object.keys(this.listeners).forEach(key => types.add(key as EventType));
    Object.keys(this.onceListeners).forEach(key => types.add(key as EventType));
    return Array.from(types);
  }
}

