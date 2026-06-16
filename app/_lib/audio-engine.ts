export type SoundId =
  | "white"
  | "pink"
  | "brown"
  | "rain"
  | "waves"
  | "tone"
  | "vacuum"
  | "chimes"
  | "fireplace"
  | "fan"
  | "wind"
  | "thunder"
  | "stream"
  | "hail"
  | "bell";

export interface SoundMeta {
  id: SoundId;
  label: string;
  emoji: string;
  description: string;
}

export const SOUNDS: SoundMeta[] = [
  { id: "rain", label: "빗소리", emoji: "🌧️", description: "차분한 비" },
  { id: "hail", label: "우박", emoji: "🧊", description: "톡톡 떨어지는 우박" },
  { id: "thunder", label: "천둥", emoji: "⛈️", description: "먼 우레 소리" },
  { id: "waves", label: "파도 소리", emoji: "🌊", description: "느린 파도" },
  { id: "stream", label: "시냇물", emoji: "💧", description: "졸졸 흐르는 물" },
  { id: "wind", label: "바람", emoji: "🌬️", description: "느린 바람" },
  { id: "fireplace", label: "모닥불", emoji: "🔥", description: "타닥거리는 장작" },
  { id: "vacuum", label: "청소기 소리", emoji: "🌀", description: "꾸준한 모터음" },
  { id: "fan", label: "선풍기", emoji: "💨", description: "부드러운 바람" },
  { id: "chimes", label: "풍경 소리", emoji: "🎐", description: "은은한 메탈 종" },
  { id: "bell", label: "교회 종소리", emoji: "⛪", description: "성당의 묵직한 종" },
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
      // 차분하게 멀리서 — heavier low end, much darker tone, very slow density
      const src = makeNoiseSource(ctx, "pink");
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 180;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1500;
      const rainGain = ctx.createGain();
      rainGain.gain.value = 0.7;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.025;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.2;
      lfo.connect(lfoAmp);
      lfoAmp.connect(rainGain.gain);
      src.connect(hp);
      hp.connect(lp);
      lp.connect(rainGain);
      rainGain.connect(gain);
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

    if (id === "vacuum") {
      // motor hum (sawtooth ~105Hz with slight vibrato) + suction (high-passed white)
      const hum = ctx.createOscillator();
      hum.type = "sawtooth";
      hum.frequency.value = 95;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.05;
      const vibrato = ctx.createOscillator();
      vibrato.type = "sine";
      vibrato.frequency.value = 1.6;
      const vibratoAmp = ctx.createGain();
      vibratoAmp.gain.value = 0.9;
      vibrato.connect(vibratoAmp);
      vibratoAmp.connect(hum.frequency);
      hum.connect(humGain);

      const noise = makeNoiseSource(ctx, "white");
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 1100;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 5500;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.5;
      noise.connect(hp);
      hp.connect(lp);
      lp.connect(noiseGain);

      humGain.connect(gain);
      noiseGain.connect(gain);
      return {
        gain,
        start: () => {
          hum.start();
          vibrato.start();
          noise.start();
        },
        stop: () => {
          try {
            hum.stop();
          } catch {}
          try {
            vibrato.stop();
          } catch {}
          try {
            noise.stop();
          } catch {}
          hum.disconnect();
          vibrato.disconnect();
          noise.disconnect();
        },
        volume: 0.45,
        active: false,
      };
    }

    if (id === "fan") {
      // gentle low hum + soft airflow
      const hum = ctx.createOscillator();
      hum.type = "sine";
      hum.frequency.value = 70;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.12;
      hum.connect(humGain);

      const noise = makeNoiseSource(ctx, "pink");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 600;
      bp.Q.value = 0.8;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.7;
      // gentle airflow LFO
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.4;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.15;
      lfo.connect(lfoAmp);
      lfoAmp.connect(noiseGain.gain);
      noise.connect(bp);
      bp.connect(noiseGain);

      humGain.connect(gain);
      noiseGain.connect(gain);
      return {
        gain,
        start: () => {
          hum.start();
          noise.start();
          lfo.start();
        },
        stop: () => {
          try {
            hum.stop();
          } catch {}
          try {
            noise.stop();
          } catch {}
          try {
            lfo.stop();
          } catch {}
          hum.disconnect();
          noise.disconnect();
          lfo.disconnect();
        },
        volume: 0.55,
        active: false,
      };
    }

    if (id === "fireplace") {
      // base low rumble + random "crackle" pops
      const noise = makeNoiseSource(ctx, "brown");
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 500;
      const baseGain = ctx.createGain();
      baseGain.gain.value = 0.55;
      noise.connect(lp);
      lp.connect(baseGain);
      baseGain.connect(gain);

      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const scheduleCrackle = () => {
        if (stopped) return;
        const delay = 400 + Math.random() * 1800;
        timer = setTimeout(() => {
          if (stopped) return;
          const now = ctx.currentTime;
          const burst = ctx.createBufferSource();
          const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
          }
          burst.buffer = buf;
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 1800;
          const env = ctx.createGain();
          const peak = 0.25 + Math.random() * 0.45;
          env.gain.setValueAtTime(0.0001, now);
          env.gain.exponentialRampToValueAtTime(peak, now + 0.005);
          env.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
          burst.connect(hp);
          hp.connect(env);
          env.connect(gain);
          burst.start(now);
          burst.stop(now + 0.13);
          scheduleCrackle();
        }, delay);
      };

      return {
        gain,
        start: () => {
          stopped = false;
          noise.start();
          scheduleCrackle();
        },
        stop: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
          try {
            noise.stop();
          } catch {}
          noise.disconnect();
        },
        volume: 0.6,
        active: false,
      };
    }

    if (id === "chimes") {
      // pentatonic chimes, randomly triggered
      const notes = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 D5 E5 G5 A5
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const playChime = () => {
        const now = ctx.currentTime;
        const freq = notes[Math.floor(Math.random() * notes.length)];
        const decay = 2.4 + Math.random() * 1.6;
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq * (i === 0 ? 1 : 2.01);
          const env = ctx.createGain();
          const peak = i === 0 ? 0.35 : 0.1;
          env.gain.setValueAtTime(0.0001, now);
          env.gain.exponentialRampToValueAtTime(peak, now + 0.01);
          env.gain.exponentialRampToValueAtTime(0.0001, now + decay);
          osc.connect(env);
          env.connect(gain);
          osc.start(now);
          osc.stop(now + decay + 0.1);
        }
      };

      const scheduleNext = () => {
        if (stopped) return;
        const delay = 1800 + Math.random() * 4500;
        timer = setTimeout(() => {
          if (stopped) return;
          playChime();
          scheduleNext();
        }, delay);
      };

      return {
        gain,
        start: () => {
          stopped = false;
          // first chime delayed slightly so it's not abrupt
          timer = setTimeout(() => {
            if (stopped) return;
            playChime();
            scheduleNext();
          }, 800);
        },
        stop: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
        },
        volume: 0.55,
        active: false,
      };
    }

    if (id === "wind") {
      // pink noise through swept bandpass + gust LFO
      const noise = makeNoiseSource(ctx, "pink");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 700;
      bp.Q.value = 0.7;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1800;

      // filter-frequency LFO (sweeping) — slower
      const sweepLfo = ctx.createOscillator();
      sweepLfo.frequency.value = 0.035;
      const sweepAmp = ctx.createGain();
      sweepAmp.gain.value = 280;
      sweepLfo.connect(sweepAmp);
      sweepAmp.connect(bp.frequency);

      // gain LFO (gusts) — slower
      const windAmp = ctx.createGain();
      windAmp.gain.value = 0.55;
      const gustLfo = ctx.createOscillator();
      gustLfo.frequency.value = 0.06;
      const gustAmp = ctx.createGain();
      gustAmp.gain.value = 0.3;
      gustLfo.connect(gustAmp);
      gustAmp.connect(windAmp.gain);

      noise.connect(bp);
      bp.connect(lp);
      lp.connect(windAmp);
      windAmp.connect(gain);

      return {
        gain,
        start: () => {
          noise.start();
          sweepLfo.start();
          gustLfo.start();
        },
        stop: () => {
          try {
            noise.stop();
          } catch {}
          try {
            sweepLfo.stop();
          } catch {}
          try {
            gustLfo.stop();
          } catch {}
          noise.disconnect();
          sweepLfo.disconnect();
          gustLfo.disconnect();
        },
        volume: 0.6,
        active: false,
      };
    }

    if (id === "thunder") {
      // distant low rumble + occasional booms
      const rumble = makeNoiseSource(ctx, "brown");
      const rumbleLp = ctx.createBiquadFilter();
      rumbleLp.type = "lowpass";
      rumbleLp.frequency.value = 180;
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0.45;
      rumble.connect(rumbleLp);
      rumbleLp.connect(rumbleGain);
      rumbleGain.connect(gain);

      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const playBoom = () => {
        const now = ctx.currentTime;
        const burst = makeNoiseSource(ctx, "brown");
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(400, now);
        lp.frequency.exponentialRampToValueAtTime(80, now + 4);
        const env = ctx.createGain();
        const peak = 0.5 + Math.random() * 0.5;
        const duration = 3 + Math.random() * 3;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(peak, now + 0.4);
        env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        burst.connect(lp);
        lp.connect(env);
        env.connect(gain);
        burst.start(now);
        burst.stop(now + duration + 0.2);
      };

      const scheduleNext = () => {
        if (stopped) return;
        const delay = 12000 + Math.random() * 28000;
        timer = setTimeout(() => {
          if (stopped) return;
          playBoom();
          scheduleNext();
        }, delay);
      };

      return {
        gain,
        start: () => {
          stopped = false;
          rumble.start();
          // first boom within 4-10s so it feels alive
          timer = setTimeout(() => {
            if (stopped) return;
            playBoom();
            scheduleNext();
          }, 4000 + Math.random() * 6000);
        },
        stop: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
          try {
            rumble.stop();
          } catch {}
          rumble.disconnect();
        },
        volume: 0.55,
        active: false,
      };
    }

    if (id === "stream") {
      // 졸졸졸 — quiet flow noise + many tiny "burble" pitched bubbles
      const flow = makeNoiseSource(ctx, "pink");
      const flowBp = ctx.createBiquadFilter();
      flowBp.type = "bandpass";
      flowBp.frequency.value = 900;
      flowBp.Q.value = 0.6;
      const flowGain = ctx.createGain();
      flowGain.gain.value = 0.18;
      flow.connect(flowBp);
      flowBp.connect(flowGain);
      flowGain.connect(gain);

      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const playBurble = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const startF = 260 + Math.random() * 480;
        const endF = startF * (0.45 + Math.random() * 0.35);
        const dur = 0.06 + Math.random() * 0.18;
        osc.frequency.setValueAtTime(startF, now);
        osc.frequency.exponentialRampToValueAtTime(endF, now + dur * 0.8);
        const env = ctx.createGain();
        const peak = 0.05 + Math.random() * 0.08;
        env.gain.setValueAtTime(0.0001, now);
        env.gain.exponentialRampToValueAtTime(peak, now + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.connect(env);
        env.connect(gain);
        osc.start(now);
        osc.stop(now + dur + 0.05);
      };

      const scheduleBurble = () => {
        if (stopped) return;
        const delay = 50 + Math.random() * 220;
        timer = setTimeout(() => {
          if (stopped) return;
          playBurble();
          scheduleBurble();
        }, delay);
      };

      return {
        gain,
        start: () => {
          stopped = false;
          flow.start();
          scheduleBurble();
        },
        stop: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
          try {
            flow.stop();
          } catch {}
          flow.disconnect();
        },
        volume: 0.55,
        active: false,
      };
    }

    if (id === "hail") {
      // continuous mid-band hiss + random sharp pings
      const noise = makeNoiseSource(ctx, "pink");
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1800;
      bp.Q.value = 0.9;
      const baseGain = ctx.createGain();
      baseGain.gain.value = 0.4;
      noise.connect(bp);
      bp.connect(baseGain);
      baseGain.connect(gain);

      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const scheduleTap = () => {
        if (stopped) return;
        const delay = 90 + Math.random() * 280;
        timer = setTimeout(() => {
          if (stopped) return;
          const now = ctx.currentTime;
          const click = ctx.createBufferSource();
          const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
          }
          click.buffer = buf;
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 2400;
          const env = ctx.createGain();
          const peak = 0.25 + Math.random() * 0.4;
          env.gain.setValueAtTime(0.0001, now);
          env.gain.exponentialRampToValueAtTime(peak, now + 0.003);
          env.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
          click.connect(hp);
          hp.connect(env);
          env.connect(gain);
          click.start(now);
          click.stop(now + 0.08);
          scheduleTap();
        }, delay);
      };

      return {
        gain,
        start: () => {
          stopped = false;
          noise.start();
          scheduleTap();
        },
        stop: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
          try {
            noise.stop();
          } catch {}
          noise.disconnect();
        },
        volume: 0.5,
        active: false,
      };
    }

    if (id === "bell") {
      // additive synthesis approximation of a large church bell (Risset-style partials)
      // ratios approximate hum / prime / tierce / quint / nominal / upper partials
      const partials = [
        { mult: 0.5, peak: 0.32, decay: 9 },
        { mult: 1.0, peak: 0.45, decay: 8 },
        { mult: 1.19, peak: 0.18, decay: 5.5 },
        { mult: 1.5, peak: 0.16, decay: 5 },
        { mult: 2.0, peak: 0.28, decay: 4.5 },
        { mult: 2.5, peak: 0.12, decay: 3 },
        { mult: 3.0, peak: 0.08, decay: 2.4 },
        { mult: 4.5, peak: 0.05, decay: 1.6 },
      ];

      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const playBell = () => {
        const now = ctx.currentTime;
        const base = 105 + Math.random() * 12;
        for (const p of partials) {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.value = base * p.mult;
          const env = ctx.createGain();
          env.gain.setValueAtTime(0.0001, now);
          env.gain.exponentialRampToValueAtTime(p.peak * 0.45, now + 0.005);
          env.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
          osc.connect(env);
          env.connect(gain);
          osc.start(now);
          osc.stop(now + p.decay + 0.1);
        }
      };

      const scheduleNext = () => {
        if (stopped) return;
        const delay = 18000 + Math.random() * 32000;
        timer = setTimeout(() => {
          if (stopped) return;
          playBell();
          scheduleNext();
        }, delay);
      };

      return {
        gain,
        start: () => {
          stopped = false;
          timer = setTimeout(() => {
            if (stopped) return;
            playBell();
            scheduleNext();
          }, 1500);
        },
        stop: () => {
          stopped = true;
          if (timer) clearTimeout(timer);
        },
        volume: 0.55,
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
