// Browser-only audio helpers for the Gemini Live conversation.
// Gemini Live listens to 16 kHz PCM audio and speaks back 24 kHz PCM audio.

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Records the microphone and calls onChunk with base64 PCM audio every ~100 ms.
export class MicStream {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private node?: AudioWorkletNode;

  async start(onChunk: (base64Pcm: string) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    // The browser resamples the microphone to 16 kHz for us.
    this.ctx = new AudioContext({ sampleRate: 16000 });
    await this.ctx.audioWorklet.addModule("/audio/mic-processor.js");
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "mic-processor");
    this.node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
      onChunk(bytesToBase64(new Uint8Array(e.data)));
    };
    source.connect(this.node);
  }

  stop() {
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.node = undefined;
    this.stream = undefined;
    this.ctx = undefined;
  }
}

// Plays Gemini's spoken reply. Chunks are queued so they play smoothly one after another.
export class AudioPlayer {
  private ctx: AudioContext;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  onSpeakingChange?: (speaking: boolean) => void;

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 24000 });
  }

  // Must be called after a user click, because browsers block audio until then.
  async resume() {
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  play(base64Pcm: string) {
    const bytes = base64ToBytes(base64Pcm);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    const buffer = this.ctx.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 0x8000;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    const startAt = Math.max(this.ctx.currentTime, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    this.sources.add(source);
    if (this.sources.size === 1) this.onSpeakingChange?.(true);
    source.onended = () => {
      this.sources.delete(source);
      if (this.sources.size === 0) this.onSpeakingChange?.(false);
    };
  }

  // Stops speaking immediately (used when the parent starts talking over Khairiyat).
  interrupt() {
    this.sources.forEach((s) => {
      s.onended = null;
      s.stop();
    });
    this.sources.clear();
    this.nextStartTime = 0;
    this.onSpeakingChange?.(false);
  }

  close() {
    this.interrupt();
    this.ctx.close();
  }
}
