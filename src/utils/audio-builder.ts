/**
 * Builds a WAV file from PCM16 audio data
 * @param audioData - Uint8Array or Int16Array of PCM16 audio samples
 * @param sampleRate - Sample rate in Hz (default: 16000)
 * @param channels - Number of channels (default: 1 for mono)
 * @returns Blob of WAV file
 */
export function buildAudioWav(audioData: Uint8Array | Int16Array, sampleRate: number = 16000, channels: number = 1): Blob {
  // Convert Uint8Array to Int16Array if needed
  let pcm16Data: Int16Array;
  if (audioData instanceof Int16Array) {
    pcm16Data = audioData;
  } else {
    // Assume Uint8Array is raw PCM16 bytes
    pcm16Data = new Int16Array(audioData.buffer, audioData.byteOffset, audioData.byteLength / 2);
  }

  const bytesPerSample = 2; // 16-bit
  const subChunk2Size = pcm16Data.length * bytesPerSample;
  const chunkSize = 36 + subChunk2Size;

  // Create the WAV header
  const buffer = new ArrayBuffer(44 + subChunk2Size);
  const view = new DataView(buffer);

  // Helper function to write strings
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, chunkSize, true);
  writeString(8, "WAVE");

  // fmt sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, channels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); // ByteRate
  view.setUint16(32, channels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(36, "data");
  view.setUint32(40, subChunk2Size, true);

  // Write PCM16 data
  const dataView = new Int16Array(buffer, 44);
  dataView.set(pcm16Data);

  return new Blob([buffer], {type: "audio/wav"});
}

/**
 * Downloads a WAV file to the user's device
 * @param blob - Blob of the WAV file
 * @param filename - Name of the file to download
 */
export function downloadAudioFile(blob: Blob, filename: string = "audio.wav"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Plays audio from a Blob
 * @param blob - Blob of audio data
 */
export function playAudioBlob(blob: Blob): HTMLAudioElement {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
  return audio;
}

/**
 * Audio collector class for accumulating audio chunks and exporting as WAV
 */
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
   */
  addChunk(chunk: Uint8Array): void {
    this.chunks.push(chunk);
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
    const wavBlob = this.buildWav();
    downloadAudioFile(wavBlob, filename);
  }

  /**
   * Play the collected audio
   */
  play(): HTMLAudioElement {
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
    const wavBlob = this.buildWav();
    return URL.createObjectURL(wavBlob);
  }
}
