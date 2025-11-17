

export function float32ToPcm16(float32Array: Float32Array) {
  const pcm16 = new Int16Array(float32Array.length);

  for (let i = 0; i < float32Array.length; i++) {
    // Clamp values to -1.0...1.0 range
    const sample = Math.max(-1, Math.min(1, float32Array[i]));

    // Convert to 16-bit range: negative values to -32768..0, positive to 0..32767
    pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return pcm16;
}
export function pcm16ToBase64(pcm16: Int16Array) {
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
}
