// Runs inside the browser's audio thread (AudioWorklet).
// Takes microphone audio (Float32, 16 kHz) and sends it to the page in
// small 16-bit PCM chunks of about 100 ms, the format Gemini Live expects.
class MicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunkSize = 1600; // 100 ms at 16,000 samples per second
    this.buffer = new Int16Array(this.chunkSize);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        const s = Math.max(-1, Math.min(1, channel[i]));
        this.buffer[this.offset++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.offset === this.chunkSize) {
          this.port.postMessage(this.buffer.buffer.slice(0));
          this.offset = 0;
        }
      }
    }
    return true; // keep running
  }
}

registerProcessor("mic-processor", MicProcessor);
