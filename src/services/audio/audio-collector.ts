import {buildAudioWav, downloadAudioFile, playAudioBlob} from "./file-processing";

export class AudioCollector {
  private chunks: Uint8Array[] = [];
  private sampleRate: number;
  private channels: number;

  constructor(sampleRate: number = 16000, channels: number = 1) {
    this.sampleRate = sampleRate;
    this.channels = channels;
  }

  /**
   * Add an audio chunk to the collection
   * Handles both Uint8Array (raw PCM16) and base64 strings
   */
  addChunk(chunk: Uint8Array | string): void {
    if (typeof chunk === "string") {
      // Decode base64 string to Uint8Array
      const binaryString = atob(chunk);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      this.chunks.push(bytes);
    } else {
      this.chunks.push(chunk);
    }
  }

  /**
   * Get the total number of bytes collected
   */
  getTotalBytes(): number {
    return this.chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  }

  /**
   * Build a WAV file from collected chunks
   */
  buildWav(): Blob {
    // Combine all chunks into a single array
    const totalBytes = this.getTotalBytes();
    const combined = new Uint8Array(totalBytes);
    let offset = 0;

    for (const chunk of this.chunks) {
      combined.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return buildAudioWav(combined, this.sampleRate, this.channels);
  }

  /**
   * Download the collected audio as a WAV file
   */
  download(filename: string = "audio.wav"): void {
    if (this.getTotalBytes() === 0) {
      console.warn("No audio data collected");
      return;
    }
    const wavBlob = this.buildWav();
    downloadAudioFile(wavBlob, filename);
  }

  /**
   * Play the collected audio
   */
  play(): HTMLAudioElement | null {
    if (this.getTotalBytes() === 0) {
      console.warn("No audio data to play");
      return null;
    }
    const wavBlob = this.buildWav();
    return playAudioBlob(wavBlob);
  }

  /**
   * Clear all collected chunks
   */
  clear(): void {
    this.chunks = [];
  }

  /**
   * Get the audio data as a blob URL for use in audio element
   */
  getBlobUrl(): string {
    if (this.getTotalBytes() === 0) {
      console.warn("No audio data to create blob URL");
      return "";
    }
    const wavBlob = this.buildWav();
    return URL.createObjectURL(wavBlob);
  }

  /**
   * Get stats about collected audio
   */
  getStats(): {totalBytes: number; chunks: number; duration: number} {
    const totalBytes = this.getTotalBytes();
    // PCM16 = 2 bytes per sample, assume 16kHz sample rate
    const samplesPerSecond = this.sampleRate * this.channels;
    const bytesPerSecond = samplesPerSecond * 2;
    const duration = totalBytes / bytesPerSecond;

    return {
      totalBytes,
      chunks: this.chunks.length,
      duration
    };
  }
}
