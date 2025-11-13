import { VoiceActivityMetrics } from '../types/audio';

export class VoiceMetrics {
  private rms: number = 0;
  private db: number = -Infinity;
  private isActive: boolean = false;
  private isPaused: boolean = false;
  private noiseFloor: number = 0;
  private threshold: number = 0.25;
  
  private voiceStartTime: number = 0;
  private voiceEndTime: number = 0;
  private totalVoiceTime: number = 0;
  
  private history: VoiceActivityMetrics[] = [];
  private maxHistoryLength: number = 100;

  update(metrics: VoiceActivityMetrics): void {
    this.rms = metrics.rms;
    this.db = metrics.db;
    this.isActive = metrics.isActive;
    this.isPaused = metrics.isPaused;
    this.noiseFloor = metrics.noiseFloor;
    this.threshold = metrics.threshold;
    
    if (metrics.isActive && !this.isActive && !this.voiceStartTime) {
      this.voiceStartTime = Date.now();
    } else if (!metrics.isActive && this.isActive && this.voiceStartTime) {
      this.voiceEndTime = Date.now();
      this.totalVoiceTime += this.voiceEndTime - this.voiceStartTime;
      this.voiceStartTime = 0;
      this.voiceEndTime = 0;
    }
    
    this.addToHistory(metrics);
  }

  private addToHistory(metrics: VoiceActivityMetrics): void {
    this.history.push(metrics);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  getCurrent(): VoiceActivityMetrics {
    return {
      rms: this.rms,
      db: this.db,
      isActive: this.isActive,
      isPaused: this.isPaused,
      noiseFloor: this.noiseFloor,
      threshold: this.threshold
    };
  }

  getRMS(): number {
    return this.rms;
  }

  getDB(): number {
    return this.db;
  }

  isVoiceActive(): boolean {
    return this.isActive;
  }

  isMicrophonePaused(): boolean {
    return this.isPaused;
  }

  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  getThreshold(): number {
    return this.threshold;
  }

  getVoiceDuration(): number {
    if (this.voiceStartTime) {
      return Date.now() - this.voiceStartTime;
    }
    return 0;
  }

  getTotalVoiceTime(): number {
    return this.totalVoiceTime;
  }

  getHistory(count?: number): VoiceActivityMetrics[] {
    if (count !== undefined) {
      return this.history.slice(-count);
    }
    return [...this.history];
  }

  getAverageRMS(count: number = 10): number {
    const recent = this.history.slice(-count);
    if (recent.length === 0) return 0;
    
    const sum = recent.reduce((acc, m) => acc + m.rms, 0);
    return sum / recent.length;
  }

  getAverageDB(count: number = 10): number {
    const recent = this.history.slice(-count);
    if (recent.length === 0) return -Infinity;
    
    const sum = recent.reduce((acc, m) => acc + m.db, 0);
    return sum / recent.length;
  }

  getPeakRMS(): number {
    if (this.history.length === 0) return 0;
    return Math.max(...this.history.map(m => m.rms));
  }

  getPeakDB(): number {
    if (this.history.length === 0) return -Infinity;
    return Math.max(...this.history.map(m => m.db));
  }

  getActivityRatio(windowSize: number = 100): number {
    const recent = this.history.slice(-windowSize);
    if (recent.length === 0) return 0;
    
    const activeCount = recent.filter(m => m.isActive).length;
    return activeCount / recent.length;
  }

  setMaxHistoryLength(length: number): void {
    this.maxHistoryLength = length;
    while (this.history.length > length) {
      this.history.shift();
    }
  }

  reset(): void {
    this.rms = 0;
    this.db = -Infinity;
    this.isActive = false;
    this.isPaused = false;
    this.noiseFloor = 0;
    this.voiceStartTime = 0;
    this.voiceEndTime = 0;
    this.totalVoiceTime = 0;
    this.history = [];
  }

  clearHistory(): void {
    this.history = [];
  }
}

