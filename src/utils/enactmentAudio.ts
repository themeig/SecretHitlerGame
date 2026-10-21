// Zero-latency Web Audio API sound effects manager for Secret Hitler
// Pre-decodes JA!, NEIN!, Liberal Fanfare, and Fascist Reveal MP3s into AudioBuffers
// in RAM so playback is 100% instantaneous (< 2ms latency) on button tap.

type SfxKey =
  | 'ja_short'
  | 'ja_shout'
  | 'nein_short'
  | 'nein_shout'
  | 'enact_liberal'
  | 'enact_fascist';

const SFX_URLS: Record<SfxKey, string> = {
  ja_short: '/audio/sfx_ja_short.mp3',
  ja_shout: '/audio/sfx_ja_shout.mp3',
  nein_short: '/audio/sfx_nein_short.mp3',
  nein_shout: '/audio/sfx_nein_shout.mp3',
  enact_liberal: '/audio/sfx_enact_liberal.mp3',
  enact_fascist: '/audio/sfx_enact_fascist.mp3',
};

class EnactmentAudioManager {
  private ctx: AudioContext | null = null;
  private rawArrayBuffers: Partial<Record<SfxKey, ArrayBuffer>> = {};
  private decodedBuffers: Partial<Record<SfxKey, AudioBuffer>> = {};
  private htmlAudioFallback: Partial<Record<SfxKey, HTMLAudioElement>> = {};
  private preloadStarted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.preloadAllSfx();
    }
  }

  private preloadAllSfx() {
    if (this.preloadStarted || typeof window === 'undefined') return;
    this.preloadStarted = true;

    (Object.keys(SFX_URLS) as SfxKey[]).forEach(key => {
      const url = SFX_URLS[key];
      // Also create preloaded HTMLAudioElement fallback
      try {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.htmlAudioFallback[key] = audio;
      } catch {
        // ignore
      }

      // Fetch binary into RAM for zero-latency Web Audio API decoding
      fetch(url)
        .then(res => res.arrayBuffer())
        .then(buf => {
          this.rawArrayBuffers[key] = buf;
          if (this.ctx) {
            this.decodeBufferForKey(key);
          }
        })
        .catch(() => {});
    });
  }

  private decodeBufferForKey(key: SfxKey) {
    if (this.decodedBuffers[key] || !this.ctx || !this.rawArrayBuffers[key]) return;
    try {
      const copy = this.rawArrayBuffers[key]!.slice(0);
      this.ctx
        .decodeAudioData(copy)
        .then(audioBuf => {
          this.decodedBuffers[key] = audioBuf;
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  }

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          // Decode any already-fetched raw buffers into AudioBuffers
          (Object.keys(SFX_URLS) as SfxKey[]).forEach(k => this.decodeBufferForKey(k));
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Instantaneous playback using pre-decoded Web Audio API AudioBuffer in RAM
  private playPreloadedSfx(key: SfxKey, gainVal: number = 1.0) {
    const ctx = this.getContext();
    if (ctx && this.decodedBuffers[key]) {
      try {
        const source = ctx.createBufferSource();
        source.buffer = this.decodedBuffers[key]!;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
        return;
      } catch {
        // fallback below
      }
    }

    // If AudioContext just initialized, trigger decode for next time and use HTMLAudioElement now
    if (ctx && !this.decodedBuffers[key] && this.rawArrayBuffers[key]) {
      this.decodeBufferForKey(key);
    }

    try {
      let el = this.htmlAudioFallback[key];
      if (!el) {
        el = new Audio(SFX_URLS[key]);
        this.htmlAudioFallback[key] = el;
      }
      el.currentTime = 0;
      el.volume = Math.min(1, gainVal);
      el.play().catch(() => {});
    } catch {
      // safe fallback
    }
  }

  private createWhiteNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Instantaneous single shouted "JA!" or "NEIN!" sound effect when pressing a vote button
  public playVoteSound(vote: 'JA' | 'NEIN') {
    if (vote === 'JA') {
      this.playPreloadedSfx('ja_short', 1.0);
    } else {
      this.playPreloadedSfx('nein_short', 1.0);
    }
  }

  // Single card slide + crisp corner snap on table felt
  public playSingleCardSlide(delaySec: number = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const start = ctx.currentTime + delaySec;
      const slideDur = 0.14;

      const noise = ctx.createBufferSource();
      noise.buffer = this.createWhiteNoiseBuffer(ctx, slideDur + 0.05);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, start);
      filter.frequency.linearRampToValueAtTime(2400, start + slideDur);
      filter.Q.setValueAtTime(1.6, start);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.22, start + slideDur * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, start + slideDur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(start);
      noise.stop(start + slideDur + 0.02);

      const tapTime = start + slideDur * 0.75;
      const osc = ctx.createOscillator();
      const tapGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, tapTime);
      osc.frequency.exponentialRampToValueAtTime(65, tapTime + 0.06);

      tapGain.gain.setValueAtTime(0.18, tapTime);
      tapGain.gain.exponentialRampToValueAtTime(0.001, tapTime + 0.065);

      osc.connect(tapGain);
      tapGain.connect(ctx.destination);
      osc.start(tapTime);
      osc.stop(tapTime + 0.07);
    } catch {
      // safe fallback
    }
  }

  // Deals N cards sequentially (e.g., 3 secret cards drawn by President)
  public playDealCardsSound(count: number = 3) {
    for (let i = 0; i < count; i++) {
      this.playSingleCardSlide(i * 0.18);
    }
  }

  // Card discard sound: aerodynamic flick whoosh + table drop slap into discard pile
  public playCardDiscardSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      const whooshDur = 0.22;
      const noise = ctx.createBufferSource();
      noise.buffer = this.createWhiteNoiseBuffer(ctx, whooshDur + 0.05);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(900, now);
      bandpass.frequency.exponentialRampToValueAtTime(3200, now + 0.1);
      bandpass.frequency.exponentialRampToValueAtTime(700, now + whooshDur);
      bandpass.Q.setValueAtTime(1.4, now);

      const whooshGain = ctx.createGain();
      whooshGain.gain.setValueAtTime(0.001, now);
      whooshGain.gain.linearRampToValueAtTime(0.28, now + 0.08);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + whooshDur);

      noise.connect(bandpass);
      bandpass.connect(whooshGain);
      whooshGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + whooshDur + 0.02);

      const dropTime = now + 0.18;
      const thud = ctx.createOscillator();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(145, dropTime);
      thud.frequency.exponentialRampToValueAtTime(38, dropTime + 0.12);

      const thudGain = ctx.createGain();
      thudGain.gain.setValueAtTime(0.32, dropTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 0.13);

      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(dropTime);
      thud.stop(dropTime + 0.14);

      const slapNoise = ctx.createBufferSource();
      slapNoise.buffer = this.createWhiteNoiseBuffer(ctx, 0.08);
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(950, dropTime);

      const slapGain = ctx.createGain();
      slapGain.gain.setValueAtTime(0.2, dropTime);
      slapGain.gain.exponentialRampToValueAtTime(0.001, dropTime + 0.06);

      slapNoise.connect(lowpass);
      lowpass.connect(slapGain);
      slapGain.connect(ctx.destination);
      slapNoise.start(dropTime);
      slapNoise.stop(dropTime + 0.07);
    } catch {
      // safe fallback
    }
  }

  // Dramatic suspense riser + accelerating heartbeat + snare drumroll before card reveal
  public playSuspenseDrumroll(durationSec: number = 1.8) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      const rollSteps = 22;
      for (let i = 0; i < rollSteps; i++) {
        const progress = i / rollSteps;
        const stepTime = now + progress * durationSec;
        const hitGainVal = 0.02 + Math.pow(progress, 2.1) * 0.22;

        const noise = ctx.createBufferSource();
        noise.buffer = this.createWhiteNoiseBuffer(ctx, 0.06);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100 + progress * 900, stepTime);
        filter.Q.setValueAtTime(1.8, stepTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(hitGainVal, stepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.055);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(stepTime);
        noise.stop(stepTime + 0.06);
      }

      const beatOffsets = [0.05, 0.22, 0.65, 0.8, 1.15, 1.28, 1.52, 1.63];
      beatOffsets.forEach((offset, idx) => {
        if (offset >= durationSec) return;
        const t = now + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const isSecondBeat = idx % 2 === 1;
        osc.frequency.setValueAtTime(isSecondBeat ? 62 : 72, t);
        osc.frequency.exponentialRampToValueAtTime(32, t + 0.12);

        gain.gain.setValueAtTime(isSecondBeat ? 0.25 : 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.14);
      });
    } catch {
      // safe fallback
    }
  }

  // Play scratchy pen sound on antique parchment
  public playSigningSound(durationSec: number = 1.8) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      const bufferSize = Math.floor(ctx.sampleRate * durationSec);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.abs(Math.sin(t * 14)) * Math.abs(Math.cos(t * 7));
        data[i] = (Math.random() * 2 - 1) * envelope * 0.22;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 2500;
      bandpass.Q.value = 2.0;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + durationSec);

      noise.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(now);
    } catch {
      // safe fallback
    }
  }

  // Stamp slam sound (deep official thud + paper impact)
  public playStampSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(34, now + 0.24);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);

      const noise = ctx.createBufferSource();
      noise.buffer = this.createWhiteNoiseBuffer(ctx, 0.09);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now);
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.28, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.09);
    } catch {
      // safe fallback
    }
  }

  // Crisp aerodynamic 3D card flip snap
  public playCardFlipSnap() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const duration = 0.09;

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(85, t + duration);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.18, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      const noise = ctx.createBufferSource();
      noise.buffer = this.createWhiteNoiseBuffer(ctx, duration);
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.16, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration * 0.7);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + duration);
    } catch {
      // safe fallback
    }
  }

  // Reveal sound:
  // - LIBERAL: Plays cheerful celebratory trumpet fanfare (/audio/sfx_enact_liberal.mp3)
  // - FASCIST: Plays ominous Secret Hitler Fascist Policy sound (/audio/sfx_enact_fascist.mp3)
  public playRevealSound(policy: 'LIBERAL' | 'FASCIST') {
    this.playCardFlipSnap();
    this.playPreloadedSfx(policy === 'LIBERAL' ? 'enact_liberal' : 'enact_fascist', 1.0);
  }
}

export const enactmentAudio = new EnactmentAudioManager();
