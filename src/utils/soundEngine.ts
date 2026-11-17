const AUDIO_PREF_KEY = 'math_voyager_audio_v2';

export type BgmTrack = 'epic' | 'cyber' | 'nebula';

export const BGM_TRACK_ORDER: BgmTrack[] = ['epic', 'cyber', 'nebula'];

export const BGM_TRACK_LABELS: Record<BgmTrack, string> = {
  epic: '史詩管弦',
  cyber: '霓虹競技',
  nebula: '星雲探索',
};

export interface AudioPreferences {
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  bgmTrack: BgmTrack;
}

class CinematicSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverbSend: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private sfxEnabled = true;
  private bgmEnabled = false;
  private bgmTrack: BgmTrack = 'epic';
  private battleUrgent = false;

  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private lastHoverAt = 0;
  private lastClickAt = 0;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(AUDIO_PREF_KEY) || localStorage.getItem('math_voyager_audio_v1');
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
          if (typeof parsed.sfxEnabled === 'boolean') {
            this.sfxEnabled = parsed.sfxEnabled;
          }
          if (typeof parsed.bgmEnabled === 'boolean') {
            this.bgmEnabled = parsed.bgmEnabled;
          }
          if (parsed.bgmTrack === 'epic' || parsed.bgmTrack === 'cyber' || parsed.bgmTrack === 'nebula') {
            this.bgmTrack = parsed.bgmTrack;
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
        JSON.stringify({
          sfxEnabled: this.sfxEnabled,
          bgmEnabled: this.bgmEnabled,
          bgmTrack: this.bgmTrack,
        })
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
    return {
      sfxEnabled: this.sfxEnabled,
      bgmEnabled: this.bgmEnabled,
      bgmTrack: this.bgmTrack,
    };
  }

  applyCloudPrefs(prefs: Partial<AudioPreferences>) {
    let changed = false;
    if (typeof prefs.sfxEnabled === 'boolean' && prefs.sfxEnabled !== this.sfxEnabled) {
      this.sfxEnabled = prefs.sfxEnabled;
      changed = true;
    }
    if (typeof prefs.bgmTrack === 'string' && BGM_TRACK_ORDER.includes(prefs.bgmTrack) && prefs.bgmTrack !== this.bgmTrack) {
      this.bgmTrack = prefs.bgmTrack;
      changed = true;
    }
    if (typeof prefs.bgmEnabled === 'boolean' && prefs.bgmEnabled !== this.bgmEnabled) {
      this.bgmEnabled = prefs.bgmEnabled;
      if (this.bgmEnabled) this.startBgmLoop();
      else this.stopBgmLoop();
      changed = true;
    }
    if (changed) {
      this.persist();
      this.notify();
    }
  }

  setBattleIntensity(urgent: boolean) {
    this.battleUrgent = urgent;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.setupStudioBus(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Studio Mastering Bus: DynamicsCompressor + Stereo Ambient Delay Reverb Network
   */
  private setupStudioBus(ctx: AudioContext) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-14, ctx.currentTime);
    comp.knee.setValueAtTime(18, ctx.currentTime);
    comp.ratio.setValueAtTime(4, ctx.currentTime);
    comp.attack.setValueAtTime(0.004, ctx.currentTime);
    comp.release.setValueAtTime(0.18, ctx.currentTime);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.92, ctx.currentTime);

    comp.connect(master);
    master.connect(ctx.destination);

    // Dual-tap spatial delay reverb bus
    const reverbSend = ctx.createGain();
    reverbSend.gain.setValueAtTime(0.32, ctx.currentTime);

    const delayL = ctx.createDelay(1.0);
    const delayR = ctx.createDelay(1.0);
    delayL.delayTime.setValueAtTime(0.19, ctx.currentTime);
    delayR.delayTime.setValueAtTime(0.29, ctx.currentTime);

    const fbL = ctx.createGain();
    const fbR = ctx.createGain();
    fbL.gain.setValueAtTime(0.28, ctx.currentTime);
    fbR.gain.setValueAtTime(0.26, ctx.currentTime);

    const dampFilter = ctx.createBiquadFilter();
    dampFilter.type = 'lowpass';
    dampFilter.frequency.setValueAtTime(2200, ctx.currentTime);

    reverbSend.connect(dampFilter);
    dampFilter.connect(delayL);
    dampFilter.connect(delayR);

    delayL.connect(fbL);
    fbL.connect(delayR);
    delayR.connect(fbR);
    fbR.connect(delayL);

    delayL.connect(comp);
    delayR.connect(comp);

    // Pre-generate crisp white noise buffer for cinematic percussion/shimmer
    const length = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.compressor = comp;
    this.masterGain = master;
    this.reverbSend = reverbSend;
    this.noiseBuffer = buffer;
  }

  private getDryNode(): AudioNode | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    return this.compressor ?? ctx.destination;
  }

  private playVoice(opts: {
    freq: number;
    freqEnd?: number;
    duration: number;
    delay?: number;
    type?: OscillatorType;
    volume?: number;
    filterFreq?: number;
    filterEnd?: number;
    filterType?: BiquadFilterType;
    attack?: number;
    wet?: number;
    detune?: number;
  }) {
    const ctx = this.ensureContext();
    const dry = this.getDryNode();
    if (!ctx || !dry) return;

    const now = ctx.currentTime + (opts.delay ?? 0);
    const dur = Math.max(0.02, opts.duration);
    const atk = Math.min(dur * 0.45, opts.attack ?? 0.012);
    const vol = opts.volume ?? 0.08;

    const osc = ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(Math.max(20, opts.freq), now);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), now + dur);
    }
    if (opts.detune) {
      osc.detune.setValueAtTime(opts.detune, now);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(vol, now + atk);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    if (opts.filterFreq !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = opts.filterType ?? 'lowpass';
      filter.frequency.setValueAtTime(opts.filterFreq, now);
      if (opts.filterEnd !== undefined) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(60, opts.filterEnd), now + dur);
      }
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(dry);
    if (this.reverbSend && (opts.wet ?? 0) > 0) {
      const sendGain = ctx.createGain();
      sendGain.gain.setValueAtTime(opts.wet ?? 0.2, now);
      gain.connect(sendGain);
      sendGain.connect(this.reverbSend);
    }

    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  private playNoiseBurst(opts: {
    duration: number;
    delay?: number;
    volume?: number;
    filterFreq?: number;
    filterType?: BiquadFilterType;
    wet?: number;
  }) {
    const ctx = this.ensureContext();
    const dry = this.getDryNode();
    if (!ctx || !dry || !this.noiseBuffer) return;

    const now = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType ?? 'highpass';
    filter.frequency.setValueAtTime(opts.filterFreq ?? 5200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(opts.volume ?? 0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dry);

    if (this.reverbSend && (opts.wet ?? 0) > 0) {
      const send = ctx.createGain();
      send.gain.setValueAtTime(opts.wet ?? 0.25, now);
      gain.connect(send);
      send.connect(this.reverbSend);
    }

    src.start(now);
    src.stop(now + opts.duration + 0.02);
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

  cycleBgmTrack() {
    const idx = BGM_TRACK_ORDER.indexOf(this.bgmTrack);
    const nextTrack = BGM_TRACK_ORDER[(idx + 1) % BGM_TRACK_ORDER.length];
    this.bgmTrack = nextTrack;
    this.bgmStep = 0;
    this.persist();
    this.stopBgmLoop();
    this.bgmEnabled = true;
    this.startBgmLoop();
    this.persist();
    this.notify();
    this.playClick();
  }

  setBgmTrack(track: BgmTrack, autoStart = false) {
    if (this.bgmTrack === track) return;
    this.bgmTrack = track;
    this.bgmStep = 0;
    this.persist();
    if (this.bgmEnabled || autoStart) {
      this.bgmEnabled = true;
      this.stopBgmLoop();
      this.startBgmLoop();
    }
    this.notify();
  }

  unlockIfNeeded() {
    const ctx = this.ensureContext();
    if (ctx && this.bgmEnabled && this.bgmTimer === null) {
      this.startBgmLoop();
    }
  }

  private startBgmLoop() {
    if (typeof window === 'undefined') return;
    if (this.bgmTimer !== null) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const intervalMs = this.bgmTrack === 'cyber' ? 235 : this.bgmTrack === 'epic' ? 310 : 520;

    const tick = () => {
      if (!this.bgmEnabled) return;
      const audioCtx = this.ensureContext();
      if (!audioCtx || audioCtx.state !== 'running') return;

      if (this.bgmTrack === 'epic') {
        this.renderEpicStep(this.bgmStep);
      } else if (this.bgmTrack === 'cyber') {
        this.renderCyberStep(this.bgmStep);
      } else {
        this.renderNebulaStep(this.bgmStep);
      }
      this.bgmStep = (this.bgmStep + 1) % 32;
    };

    tick();
    this.bgmTimer = window.setInterval(tick, intervalMs);
  }

  /**
   * Track 1: 史詩管弦電音 (Hollywood Orchestral Hybrid)
   * D minor -> Bb major -> G minor -> A7sus4/A7
   */
  private renderEpicStep(step: number) {
    const bar = Math.floor(step / 8); // 4 bars of 8 8th-notes
    const beat = step % 8;
    const bassRoots = [73.42, 58.27, 49.0, 55.0]; // D2, Bb1, G1, A1
    const chords = [
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [233.08, 293.66, 349.23, 440.0], // Bbmaj7
      [246.94, 293.66, 349.23, 440.0], // Gm9 flavor
      [220.0, 277.18, 329.63, 392.0], // A7
    ];
    const leadMotif = [
      587.33, 0, 659.25, 698.46, 587.33, 0, 523.25, 440.0,
      587.33, 0, 698.46, 880.0, 783.99, 0, 698.46, 659.25,
      587.33, 0, 659.25, 783.99, 698.46, 0, 587.33, 523.25,
      440.0, 523.25, 587.33, 659.25, 698.46, 0, 880.0, 0,
    ];

    const root = bassRoots[bar];
    const chord = chords[bar];

    // Orchestral Sub-Bass + String Pad swell on downbeats
    if (beat === 0) {
      this.playVoice({
        freq: root,
        duration: 1.9,
        type: 'sine',
        volume: 0.058,
        attack: 0.08,
      });
      // Lush detuned orchestral string ensemble chord
      chord.forEach((n, idx) => {
        this.playVoice({
          freq: n,
          duration: 2.25,
          type: 'sawtooth',
          volume: 0.012,
          filterFreq: this.battleUrgent ? 1350 : 880,
          filterEnd: 460,
          attack: 0.25,
          wet: 0.45,
          detune: idx % 2 === 0 ? -6 : 6,
        });
      });
    }

    // Driving cinematic low ostinato pulse
    if (beat % 2 === 0 || (this.battleUrgent && beat % 2 === 1)) {
      this.playVoice({
        freq: root * 2,
        duration: 0.24,
        type: 'triangle',
        volume: beat === 0 ? 0.036 : 0.022,
        filterFreq: 680,
        attack: 0.01,
        wet: 0.15,
      });
    }

    // Heroic French Horn / Synth Brass Lead
    const lead = leadMotif[step];
    if (lead > 0) {
      this.playVoice({
        freq: lead,
        duration: 0.48,
        type: 'sawtooth',
        volume: 0.018,
        filterFreq: 1600,
        filterEnd: 780,
        attack: 0.04,
        wet: 0.48,
      });
    }

    // Subtle cinematic percussion
    if (beat === 0 || beat === 4) {
      this.playVoice({ freq: 92, freqEnd: 38, duration: 0.16, type: 'sine', volume: 0.042, attack: 0.004 });
    }
    if (beat === 2 || beat === 6 || (this.battleUrgent && beat % 2 === 1)) {
      this.playNoiseBurst({ duration: 0.06, volume: 0.011, filterFreq: 4600, wet: 0.2 });
    }
  }

  /**
   * Track 2: 霓虹極速競技 (Cyber Arena Synthwave)
   */
  private renderCyberStep(step: number) {
    const bassSeq = [
      110, 110, 220, 110, 110, 110, 220, 164.81,
      87.31, 87.31, 174.61, 87.31, 87.31, 87.31, 174.61, 130.81,
      130.81, 130.81, 261.63, 130.81, 130.81, 130.81, 261.63, 196.0,
      98.0, 98.0, 196.0, 98.0, 123.47, 123.47, 246.94, 164.81,
    ];
    const arpSeq = [
      440, 523.25, 659.25, 880, 659.25, 523.25, 440, 659.25,
      349.23, 440, 523.25, 698.46, 523.25, 440, 349.23, 523.25,
      523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 783.99,
      392.0, 493.88, 587.33, 783.99, 659.25, 587.33, 493.88, 392.0,
    ];

    // Punchy synth bass
    this.playVoice({
      freq: bassSeq[step],
      duration: 0.2,
      type: 'sawtooth',
      volume: 0.032,
      filterFreq: this.battleUrgent ? 1400 : 880,
      filterEnd: 190,
      attack: 0.005,
    });

    // Plucky Cyber Arpeggio with stereo delay
    this.playVoice({
      freq: arpSeq[step],
      duration: 0.22,
      type: 'square',
      volume: 0.012,
      filterFreq: this.battleUrgent ? 2400 : 1500,
      filterEnd: 420,
      attack: 0.006,
      wet: 0.42,
    });

    // 4-on-the-floor electronic kick + crisp off-beat hi-hat
    if (step % 4 === 0) {
      this.playVoice({ freq: 125, freqEnd: 42, duration: 0.14, type: 'sine', volume: 0.052, attack: 0.002 });
    }
    if (step % 2 === 1 || (this.battleUrgent && step % 1 === 0)) {
      this.playNoiseBurst({ duration: 0.045, volume: step % 4 === 2 ? 0.018 : 0.01, filterFreq: 6800, wet: 0.12 });
    }
  }

  /**
   * Track 3: 星雲深空探索 (Deep Nebula Ambient)
   */
  private renderNebulaStep(step: number) {
    const bar = Math.floor(step / 8);
    const beat = step % 8;
    const pads = [
      [174.61, 261.63, 329.63, 440.0], // Fmaj9
      [130.81, 261.63, 329.63, 392.0], // Cmaj7
      [220.0, 261.63, 329.63, 493.88], // Am9
      [164.81, 246.94, 329.63, 392.0], // Em7
    ];
    const chimes = [659.25, 0, 783.99, 0, 880, 0, 523.25, 0];

    if (beat === 0) {
      pads[bar].forEach((f, idx) => {
        this.playVoice({
          freq: f,
          duration: 3.8,
          type: 'sine',
          volume: 0.024,
          attack: 0.45,
          wet: 0.55,
          detune: idx % 2 === 0 ? -4 : 4,
        });
      });
    }

    const chime = chimes[beat];
    if (chime > 0) {
      this.playVoice({
        freq: chime * (bar % 2 === 1 ? 1.5 : 1),
        duration: 0.95,
        type: 'triangle',
        volume: 0.016,
        filterFreq: 1800,
        attack: 0.02,
        wet: 0.65,
      });
    }
  }

  private stopBgmLoop() {
    if (typeof window !== 'undefined' && this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  // --- Physical Tactile UI & Cinematic Battle SFX ---

  playClick() {
    if (!this.sfxEnabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastClickAt < 50) return;
    this.lastClickAt = nowMs;
    // Tactile micro-switch click (bright transient + warm mechanical body)
    this.playVoice({ freq: 1180, freqEnd: 540, duration: 0.032, type: 'triangle', volume: 0.045, attack: 0.002 });
    this.playVoice({ freq: 240, freqEnd: 120, duration: 0.042, type: 'sine', volume: 0.038, attack: 0.002 });
  }

  playHoverLock() {
    if (!this.sfxEnabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastHoverAt < 180) return;
    this.lastHoverAt = nowMs;
    this.playVoice({ freq: 920, freqEnd: 1140, duration: 0.045, type: 'sine', volume: 0.022, wet: 0.25 });
  }

  playSlideFlip() {
    if (!this.sfxEnabled) return;
    this.playVoice({ freq: 440, freqEnd: 680, duration: 0.085, type: 'sine', volume: 0.045, wet: 0.25 });
  }

  playWarp() {
    if (!this.sfxEnabled) return;
    this.playVoice({ freq: 220, freqEnd: 780, duration: 0.28, type: 'sawtooth', volume: 0.042, filterFreq: 1600, wet: 0.45 });
    this.playVoice({ freq: 440, freqEnd: 1120, duration: 0.24, delay: 0.05, type: 'triangle', volume: 0.045, wet: 0.45 });
    this.playNoiseBurst({ duration: 0.2, volume: 0.018, filterFreq: 2400, filterType: 'bandpass', wet: 0.4 });
  }

  playMatchSuccess() {
    if (!this.sfxEnabled) return;
    this.playVoice({ freq: 587.33, duration: 0.14, type: 'triangle', volume: 0.065, wet: 0.35 });
    this.playVoice({ freq: 880, duration: 0.22, delay: 0.065, type: 'sine', volume: 0.075, wet: 0.45 });
  }

  /**
   * 3A Correct SFX: Crisp, explosive positive chime + shimmer harmonic release
   */
  playCorrect(streak = 1) {
    if (!this.sfxEnabled) return;
    const semitoneShift = Math.min(5, Math.max(0, streak - 1));
    const ratio = Math.pow(2, semitoneShift / 12);
    const notes = [523.25 * ratio, 659.25 * ratio, 783.99 * ratio, 1046.5 * ratio];

    // Energetic punch attack
    this.playVoice({ freq: notes[0] * 0.5, duration: 0.18, type: 'sine', volume: 0.075, attack: 0.003 });
    notes.forEach((n, idx) => {
      this.playVoice({
        freq: n,
        duration: 0.24 + idx * 0.05,
        delay: idx * 0.042,
        type: idx === 3 ? 'sine' : 'triangle',
        volume: 0.068,
        filterFreq: 3200,
        attack: 0.004,
        wet: 0.48,
      });
    });
    // Crisp sparkle shimmer
    this.playNoiseBurst({ duration: 0.12, delay: 0.08, volume: 0.016, filterFreq: 6400, wet: 0.5 });
  }

  /**
   * 3A Wrong SFX: Smooth, low, authoritative warm muted thud (no harsh sawtooth screech)
   */
  playWrong() {
    if (!this.sfxEnabled) return;
    // Warm sub-muted two-step cadence
    this.playVoice({
      freq: 207.65,
      freqEnd: 174.61,
      duration: 0.16,
      type: 'triangle',
      volume: 0.075,
      filterFreq: 420,
      attack: 0.014,
      wet: 0.2,
    });
    this.playVoice({
      freq: 155.56,
      freqEnd: 116.54,
      duration: 0.28,
      delay: 0.11,
      type: 'sine',
      volume: 0.085,
      attack: 0.016,
      wet: 0.22,
    });
  }

  /**
   * Kahoot Question Start Cue
   */
  playQuestionStart() {
    if (!this.sfxEnabled) return;
    this.playVoice({ freq: 330, freqEnd: 660, duration: 0.22, type: 'triangle', volume: 0.06, filterFreq: 1800, wet: 0.4 });
    this.playVoice({ freq: 880, duration: 0.26, delay: 0.14, type: 'sine', volume: 0.07, wet: 0.5 });
  }

  /**
   * Kahoot Answer Reveal Cue (公布答案音效)
   */
  playAnswerReveal() {
    if (!this.sfxEnabled) return;
    const chord = [349.23, 523.25, 659.25, 880];
    chord.forEach((f, idx) => {
      this.playVoice({
        freq: f,
        duration: 0.45,
        delay: idx * 0.03,
        type: idx < 2 ? 'triangle' : 'sine',
        volume: 0.055,
        filterFreq: 2400,
        attack: 0.008,
        wet: 0.5,
      });
    });
  }

  playCelebrate() {
    if (!this.sfxEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playVoice({ freq: n, duration: 0.28, delay: idx * 0.065, type: 'triangle', volume: 0.07, wet: 0.45 });
    });
  }

  playBattleTick(urgent = false) {
    if (!this.sfxEnabled) return;
    this.playVoice({
      freq: urgent ? 1318.51 : 987.77,
      freqEnd: urgent ? 1046.5 : 880,
      duration: 0.055,
      type: 'triangle',
      volume: urgent ? 0.06 : 0.04,
      attack: 0.002,
      wet: 0.15,
    });
  }

  /**
   * 3-Stage Hollywood Podium Settlement Audio Sequence:
   * 1) Brisk rhythmic score-roll ticks (0.0s - 0.8s)
   * 2) Heavy sub-bass cinematic impact slam on rank reveal (0.85s)
   * 3) Triumphant orchestral brass/chime victory fanfare (1.05s - 2.6s)
   */
  playBattleVictory() {
    if (!this.sfxEnabled) return;

    // Stage 1: Score roll accelerating ticks
    const rollFreqs = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319];
    rollFreqs.forEach((f, idx) => {
      this.playVoice({
        freq: f,
        duration: 0.06,
        delay: idx * 0.072,
        type: 'triangle',
        volume: 0.042,
        attack: 0.002,
        wet: 0.22,
      });
    });

    // Stage 2: Deep sub-bass cinematic trailer slam on rank reveal
    this.playVoice({
      freq: 110,
      freqEnd: 36,
      duration: 0.42,
      delay: 0.82,
      type: 'sine',
      volume: 0.14,
      attack: 0.004,
      wet: 0.3,
    });
    this.playNoiseBurst({
      duration: 0.28,
      delay: 0.82,
      volume: 0.032,
      filterFreq: 1400,
      filterType: 'lowpass',
      wet: 0.45,
    });

    // Stage 3: Glorious Orchestral Brass & Chime Fanfare
    const fanfare: { freq: number; delay: number; dur: number }[] = [
      { freq: 392.0, delay: 1.04, dur: 0.2 },
      { freq: 523.25, delay: 1.2, dur: 0.2 },
      { freq: 659.25, delay: 1.36, dur: 0.22 },
      { freq: 783.99, delay: 1.54, dur: 0.36 },
      { freq: 659.25, delay: 1.82, dur: 0.18 },
      { freq: 1046.5, delay: 1.98, dur: 0.95 },
    ];

    fanfare.forEach((n) => {
      // Brass layer
      this.playVoice({
        freq: n.freq,
        duration: n.dur,
        delay: n.delay,
        type: 'sawtooth',
        volume: 0.045,
        filterFreq: 2100,
        filterEnd: 1100,
        attack: 0.015,
        wet: 0.55,
      });
      // Octave sparkle layer
      this.playVoice({
        freq: n.freq * 2,
        duration: n.dur,
        delay: n.delay,
        type: 'sine',
        volume: 0.025,
        attack: 0.015,
        wet: 0.6,
      });
    });

    // Final triumphant chord pad under C6
    [261.63, 392.0, 523.25].forEach((f) => {
      this.playVoice({
        freq: f,
        duration: 1.1,
        delay: 1.98,
        type: 'triangle',
        volume: 0.035,
        filterFreq: 1600,
        attack: 0.04,
        wet: 0.55,
      });
    });
  }
}

export const soundEngine = new CinematicSoundEngine();
