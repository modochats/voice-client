class AudioCollector {
  audioContext: AudioContext | null = null;
  mediaStream: MediaStream | null = null;
  mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  scriptProcessorNode: ScriptProcessorNode | null = null;
  recordedChunks: Float32Array[][] = [];
  bufferSize = 4096;
  actualNumChannels = 0;
  chunkAddCounter = 0;
  tempChunkCreateCallback?: (base64String: string) => void;
  getVolume: () => number = () => 0;
  constructor() {}

  init({
    audioContext,
    mediaStream,
    tempChunkCreateCallback,
    getVolume
  }: {
    audioContext: AudioContext;
    mediaStream: MediaStream;
    tempChunkCreateCallback?: (base64String: string) => void;
    getVolume?: () => number;
  }): void {
    this.recordedChunks = [];
    this.tempChunkCreateCallback = tempChunkCreateCallback;
    if (getVolume) {
      this.getVolume = getVolume;
    }
    try {
      // @ts-ignore
      this.audioContext = audioContext;

      this.mediaStream = mediaStream;
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);

      const audioTrack = this.mediaStream.getAudioTracks()[0];
      const trackSettings = audioTrack.getSettings();
      this.actualNumChannels = trackSettings.channelCount || this.mediaStreamSource.channelCount || 1;

      this.scriptProcessorNode = this.audioContext.createScriptProcessor(this.bufferSize, this.actualNumChannels, this.actualNumChannels);

      this.scriptProcessorNode.onaudioprocess = event => {
        const volume = this.getVolume();
        // if (volume < 1) return;
        this.addChunk(event);
        if (this.chunkAddCounter >= 3) {
          this.processAndEncode({processAll: false});
          this.chunkAddCounter = 0;
        }
      };

      this.mediaStreamSource.connect(this.scriptProcessorNode);
      this.scriptProcessorNode.connect(this.audioContext.destination);
    } catch (err) {
      console.error("Generator: Error starting recording:", err);
      this.processAndEncode();
    }
  }
  async addChunk(event: AudioProcessingEvent) {
    const inputBuffer = event.inputBuffer;
    const bufferChannels = [];
    for (let i = 0; i < this.actualNumChannels; i++) {
      bufferChannels.push(new Float32Array(inputBuffer.getChannelData(i)));
    }
    this.recordedChunks.push(bufferChannels);
    this.chunkAddCounter++;
  }

  async reset() {
    await this.processAndEncode();
    this.recordedChunks = [];
    this.chunkAddCounter = 0;
  }

  async processAndEncode({processAll}: {processAll: boolean} = {processAll: true}) {
    if (this.recordedChunks.length === 0) return;
    const chunksCopy = [...this.recordedChunks];
    const chunksToProcess = processAll ? chunksCopy : chunksCopy.slice(-3);
    return new Promise<string>((resolve, reject) => {
      setTimeout(() => {
        try {
          const numberOfChannels = chunksToProcess[0].length;
          const totalLength = chunksToProcess.reduce((sum, chunks) => sum + chunks[0].length, 0);
          const combinedChannels = [];

          for (let i = 0; i < numberOfChannels; i++) {
            const channelData = new Float32Array(totalLength);
            let offset = 0;
            chunksToProcess.forEach((buffer, index) => {
              channelData.set(buffer[i], offset);
              offset += buffer[i].length;
            });
            combinedChannels.push(channelData);
          }
          if (processAll) this.recordedChunks = [];

          const targetNumChannels = parseInt("1", 10);

          let finalChannelData = [];
          if (numberOfChannels === 1 && targetNumChannels === 2) {
            finalChannelData.push(combinedChannels[0]);
            finalChannelData.push(new Float32Array(combinedChannels[0]));
          } else if (numberOfChannels === 2 && targetNumChannels === 1) {
            const monoData = new Float32Array(totalLength);
            for (let i = 0; i < totalLength; i++) {
              monoData[i] = (combinedChannels[0][i] + combinedChannels[1][i]) / 2;
            }
            finalChannelData.push(monoData);
          } else {
            finalChannelData = combinedChannels;
          }
          const outputNumChannels = finalChannelData.length;

          let interleavedData;
          if (outputNumChannels === 1) {
            interleavedData = finalChannelData[0];
          } else {
            interleavedData = new Float32Array(totalLength * 2);
            for (let i = 0; i < totalLength; i++) {
              interleavedData[i * 2] = finalChannelData[0][i];
              interleavedData[i * 2 + 1] = finalChannelData[1][i];
            }
          }

          let outputBuffer;
          const numSamples = interleavedData.length;

          outputBuffer = new Int16Array(numSamples);
          for (let i = 0; i < numSamples; i++) {
            const sample = Math.max(-1, Math.min(1, interleavedData[i]));
            outputBuffer[i] = Math.round(sample * 32767);
          }

          const base64String = arrayBufferToBase64(outputBuffer.buffer);
          // console.log(processAll ? "ALL :" : "PARTIAL :", base64String);
          resolve(base64String);
          if (!processAll && this.tempChunkCreateCallback) this.tempChunkCreateCallback(base64String);
        } catch (err) {
          reject(err);
        }
      }, 50);
    });
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
export {AudioCollector};
