// src/utils/audioAnnouncer.ts
class AudioAnnouncerEngine {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private voiceEnabled: boolean = true;
  private sirenEnabled: boolean = true;
  private volume: number = 0.85;
  private lastSpokenTime: number = 0;
  private isUnlocked: boolean = false;

  constructor() {
    try {
      const savedMute = localStorage.getItem('safewatch_audio_muted');
      if (savedMute !== null) this.isMuted = savedMute === 'true';
      const savedVoice = localStorage.getItem('safewatch_voice_enabled');
      if (savedVoice !== null) this.voiceEnabled = savedVoice === 'true';
      const savedSiren = localStorage.getItem('safewatch_siren_enabled');
      if (savedSiren !== null) this.sirenEnabled = savedSiren === 'true';
    } catch (_) {}

    // Register auto-unlock on first user interaction
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    }
  }

  public unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          this.isUnlocked = true;
        }).catch(() => {});
      } else {
        this.isUnlocked = true;
      }
      // Prime speech synthesis
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
      }
    } catch (_) {}
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('safewatch_audio_muted', String(muted));
    } catch (_) {}
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    try {
      localStorage.setItem('safewatch_voice_enabled', String(enabled));
    } catch (_) {}
  }

  public getVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public setSirenEnabled(enabled: boolean) {
    this.sirenEnabled = enabled;
    try {
      localStorage.setItem('safewatch_siren_enabled', String(enabled));
    } catch (_) {}
  }

  public getSirenEnabled(): boolean {
    return this.sirenEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  // Synthesize Tactical Alarm Chime & Warble
  public playAlertTone(type: 'breach' | 'warning' | 'chime' | 'critical' = 'breach') {
    if (this.isMuted || !this.sirenEnabled) return;
    this.unlockAudio();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'breach' || type === 'critical') {
        // High-pitch dual warble siren
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(960, now);
        osc.frequency.linearRampToValueAtTime(520, now + 0.15);
        osc.frequency.linearRampToValueAtTime(960, now + 0.3);
        osc.frequency.linearRampToValueAtTime(480, now + 0.45);

        gain.gain.setValueAtTime(0.35 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.start(now);
        osc.stop(now + 0.5);
      } else if (type === 'warning') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.3);

        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Interface Chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(850, now);
        osc.frequency.exponentialRampToValueAtTime(1350, now + 0.2);

        gain.gain.setValueAtTime(0.25 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch (_) {}
  }

  // Speak Automated Voice Alert with SpeechSynthesis
  public speakVoiceAlert(text: string, priority: boolean = false) {
    if (this.isMuted) return;
    this.unlockAudio();

    // Always play alert sound first
    this.playAlertTone(priority ? 'breach' : 'warning');

    if (!this.voiceEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    // Debounce non-priority alerts
    if (!priority && now - this.lastSpokenTime < 4000) return;
    this.lastSpokenTime = now;

    try {
      window.speechSynthesis.cancel(); // cancel previous if queued

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = this.volume;

      // Select an English voice if available
      const voices = window.speechSynthesis.getVoices();
      const engVoice = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Samantha'))
      ) || voices.find((v) => v.lang.startsWith('en'));

      if (engVoice) utterance.voice = engVoice;

      // Delay speech slightly to let the initial alarm chime ring out
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (_) {}
      }, 250);
    } catch (_) {}
  }

  public testBroadcast() {
    this.unlockAudio();
    this.speakVoiceAlert('SafeWatch City Intelligence Command: AI Voice Announcer operational. All surveillance channels active.', true);
  }
}

export const audioAnnouncer = new AudioAnnouncerEngine();

