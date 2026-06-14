export type SoundId = "white" | "pink" | "brown" | "rain" | "waves" | "tone";

export interface SoundMeta {
  id: SoundId;
  label: string;
  emoji: string;
  description: string;
}

export const SOUNDS: SoundMeta[] = [
  { id: "rain", label: "빗소리", emoji: "🌧️", description: "잔잔한 비" },
  { id: "waves", label: "파도 소리", emoji: "🌊", description: "느린 파도" },
  { id: "brown", label: "브라운 노이즈", emoji: "🟫", description: "깊고 묵직" },
  { id: "pink", label: "핑크 노이즈", emoji: "🌸", description: "따뜻한 잡음" },
  { id: "white", label: "백색 소음", emoji: "⚪", description: "균일한 잡음" },
  { id: "tone", label: "명상 톤", emoji: "🔔", description: "은은한 저주파" },
];

type NoiseColor = "white" | "pink" | "brown";

function buildNoiseBuffer(ctx: AudioContext, type: NoiseColor): AudioBuffer {
  const duration = 2;
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    if (type === "white") {
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } else if (type === "pink") {
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
        b6 = w * 0.115926;
        data[i] = pink * 0.11;
      }
    } else {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }
  }
  return buffer;
}

function makeNoiseSource(ctx: AudioContext, type: NoiseColor): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buildNoiseBuffer(ctx, type);
  src.loop = true;
  return src;
}

interface Track {
  gain: GainNode;
  start: () => void;
  stop: () => void;
  volume: number;
  active: boolean;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private tracks = new Map<SoundId, Track>();
  private listeners = new Set<() => void>();
  private fadeTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  private notify() {
    this.listeners.forEach((l) => l());
  }

  async ensure(): Promise<AudioContext> {
    if (!this.ctx) {
      const win = window as Window &
        typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const Ctx = win.AudioContext || win.webkitAudioContext;
      if (!Ctx) throw new Error("Web Audio API not supported in this browser");
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  private buildTrack(id: SoundId): Track {
    const ctx = this.ctx!;
    const master = this.master!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(master);

    if (id === "white" || id === "pink" || id === "brown") {
      const src = makeNoiseSource(ctx, id);
      src.connect(gain);
      return {
        gain,
        start: () => src.start(),
        stop: () => {
          try {
            src.stop();
          } catch {}
          src.disconnect();
        },
        volume: 0.5,
        active: false,
      };
    }

    if (id === "rain") {
      const src = makeNoiseSource(ctx, "white");
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 700;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 5200;
      src.connect(hp);
      hp.connect(lp);
      lp.connect(gain);
      return {
        gain,
        start: () => src.start(),
        stop: () => {
          try {
            src.stop();
          } catch {}
          src.disconnect();
        },
        volume: 0.6,
        active: false,
      };
    }

    if (id === "waves") {
      const src = makeNoiseSource(ctx, "brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      const wavesAmp = ctx.createGain();
      wavesAmp.gain.value = 0.4;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.12;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.4;
      lfo.connect(lfoGain);
      lfoGain.connect(wavesAmp.gain);
      src.connect(lp);
      lp.connect(wavesAmp);
      wavesAmp.connect(gain);
      return {
        gain,
        start: () => {
          src.start();
          lfo.start();
        },
        stop: () => {
          try {
            src.stop();
          } catch {}
          try {
            lfo.stop();
          } catch {}
          src.disconnect();
          lfo.disconnect();
        },
        volume: 0.65,
        active: false,
      };
    }

    // tone — gentle dual sine for binaural-ish meditation tone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.value = 220;
    osc2.frequency.value = 224;
    const blend = ctx.createGain();
    blend.gain.value = 0.16;
    osc1.connect(blend);
    osc2.connect(blend);
    blend.connect(gain);
    return {
      gain,
      start: () => {
        osc1.start();
        osc2.start();
      },
      stop: () => {
        try {
          osc1.stop();
        } catch {}
        try {
          osc2.stop();
        } catch {}
        osc1.disconnect();
        osc2.disconnect();
      },
      volume: 0.35,
      active: false,
    };
  }

  async toggle(id: SoundId): Promise<void> {
    await this.ensure();
    this.cancelFade();
    let track = this.tracks.get(id);
    if (!track) {
      track = this.buildTrack(id);
      track.start();
      this.tracks.set(id, track);
    }
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (track.active) {
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setValueAtTime(track.gain.gain.value, now);
      track.gain.gain.linearRampToValueAtTime(0, now + 0.4);
      track.active = false;
    } else {
      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setValueAtTime(track.gain.gain.value, now);
      track.gain.gain.linearRampToValueAtTime(track.volume, now + 0.6);
      track.active = true;
    }
    this.notify();
  }

  setVolume(id: SoundId, value: number): void {
    const vol = Math.max(0, Math.min(1, value));
    const track = this.tracks.get(id);
    if (track) {
      track.volume = vol;
      if (track.active && this.ctx) {
        const now = this.ctx.currentTime;
        track.gain.gain.cancelScheduledValues(now);
        track.gain.gain.setValueAtTime(track.gain.gain.value, now);
        track.gain.gain.linearRampToValueAtTime(vol, now + 0.12);
      }
      this.notify();
    } else {
      const seed = this.pendingVolumes;
      seed.set(id, vol);
      this.notify();
    }
  }

  private pendingVolumes = new Map<SoundId, number>();

  getVolume(id: SoundId): number {
    return this.tracks.get(id)?.volume ?? this.pendingVolumes.get(id) ?? 0.5;
  }

  isActive(id: SoundId): boolean {
    return !!this.tracks.get(id)?.active;
  }

  anyActive(): boolean {
    for (const t of this.tracks.values()) if (t.active) return true;
    return false;
  }

  stopAll(): void {
    for (const t of this.tracks.values()) t.stop();
    this.tracks.clear();
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(1, now);
    }
    this.notify();
  }

  fadeOutAndStop(seconds: number): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + seconds);
    if (this.fadeTimer) clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(
      () => {
        this.stopAll();
        this.fadeTimer = null;
      },
      seconds * 1000 + 100,
    );
  }

  cancelFade(): void {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.ctx && this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(1, now + 0.3);
    }
  }
}

let engineSingleton: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (typeof window === "undefined") {
    throw new Error("AudioEngine is browser-only");
  }
  if (!engineSingleton) engineSingleton = new AudioEngine();
  return engineSingleton;
}
