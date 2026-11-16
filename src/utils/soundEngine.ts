const AUDIO_PREF_KEY = 'math_voyager_audio_v1';

interface AudioPreferences {
  sfxEnabled: boolean;
  bgmEnabled: boolean;
}

class SpaceSoundEngine {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private bgmEnabled = false;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private lastHoverAt = 0;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(AUDIO_PREF_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
          if (typeof parsed.sfxEnabled === 'boolean') {
            this.sfxEnabled = parsed.sfxEnabled;
          }
          if (typeof parsed.bgmEnabled === 'boolean') {
            this.bgmEnabled = parsed.bgmEnabled;
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        AUDIO_PREF_KEY,
        JSON.stringify({ sfxEnabled: this.sfxEnabled, bgmEnabled: this.bgmEnabled })
      );
    } catch {
      // Ignore quota errors
    }
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getPrefs(): AudioPreferences {
    return { sfxEnabled: this.sfxEnabled, bgmEnabled: this.bgmEnabled };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delaySec = 0,
    freqEnd?: number
  ) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.02, durationSec * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.persist();
    this.notify();
    if (enabled) {
      this.playClick();
    }
  }

  toggleSfx() {
    this.setSfxEnabled(!this.sfxEnabled);
  }

  setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    this.persist();
    if (enabled) {
      this.startBgmLoop();
    } else {
      this.stopBgmLoop();
    }
    this.notify();
  }

  toggleBgm() {
    this.setBgmEnabled(!this.bgmEnabled);
  }

  unlockIfNeeded() {
    if (this.bgmEnabled && this.bgmTimer === null) {
      this.startBgmLoop();
    }
  }

  private startBgmLoop() {
    if (typeof window === 'undefined') return;
    if (this.bgmTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Gentle cosmic ambient arpeggio (Am9 -> Fmaj7 -> Cmaj9 -> G6)
    const sequence = [220, 261.63, 329.63, 493.88, 174.61, 220, 261.63, 392.0, 261.63, 329.63, 392.0, 587.33, 196.0, 246.94, 329.63, 440.0];

    const playNote = () => {
      if (!this.bgmEnabled) return;
      const audioCtx = this.ensureContext();
      if (!audioCtx || audioCtx.state !== 'running') return;

      const freq = sequence[this.bgmStep % sequence.length];
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(760, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.028, now + 0.14);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.75);

      this.bgmStep = (this.bgmStep + 1) % sequence.length;
    };

    playNote();
    this.bgmTimer = window.setInterval(playNote, 620);
  }

  private stopBgmLoop() {
    if (typeof window !== 'undefined' && this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  playClick() {
    this.tone(620, 0.055, 'sine', 0.05, 0, 780);
  }

  playHoverLock() {
    const nowMs = Date.now();
    if (nowMs - this.lastHoverAt < 180) return;
    this.lastHoverAt = nowMs;
    this.tone(880, 0.04, 'triangle', 0.03, 0, 1020);
  }

  playSlideFlip() {
    this.tone(420, 0.08, 'sine', 0.045, 0, 620);
  }

  playWarp() {
    this.tone(240, 0.24, 'sine', 0.07, 0, 740);
    this.tone(480, 0.18, 'triangle', 0.05, 0.08, 960);
  }

  playMatchSuccess() {
    this.tone(587.33, 0.1, 'triangle', 0.07, 0);
    this.tone(880, 0.16, 'sine', 0.07, 0.07);
  }

  playCorrect(streak = 1) {
    const pitchBoost = Math.min(4, Math.max(0, streak - 1)) * 45;
    this.tone(523.25 + pitchBoost, 0.11, 'triangle', 0.08, 0);
    this.tone(659.25 + pitchBoost, 0.12, 'triangle', 0.08, 0.07);
    this.tone(783.99 + pitchBoost, 0.18, 'sine', 0.085, 0.14);
  }

  playWrong() {
    this.tone(220, 0.14, 'sawtooth', 0.045, 0, 175);
    this.tone(175, 0.18, 'sawtooth', 0.04, 0.1, 140);
  }

  playCelebrate() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, 'triangle', 0.08, idx * 0.075);
    });
  }

  playBattleTick() {
    this.tone(920, 0.05, 'sine', 0.045, 0);
  }

  playBattleVictory() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    fanfare.forEach((n, idx) => {
      this.tone(n, 0.26, 'triangle', 0.085, idx * 0.085);
    });
  }
}

export const soundEngine = new SpaceSoundEngine();
