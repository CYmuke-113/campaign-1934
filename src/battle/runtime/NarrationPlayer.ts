import type { Settings } from '../../utils/storage';
import type { AudioManager } from './AudioManager';

export interface NarrationCallbacks {
  onLineStart: (text: string) => void;
  onLineEnd: () => void;
}

export class NarrationPlayer {
  private settings: Settings;
  private readonly audio: AudioManager;
  private readonly callbacks: NarrationCallbacks;
  private utterance: SpeechSynthesisUtterance | null = null;
  private fallbackTimer: number | null = null;
  private token = 0;
  private paused = false;

  constructor(audio: AudioManager, settings: Settings, callbacks: NarrationCallbacks) {
    this.audio = audio;
    this.settings = { ...settings };
    this.callbacks = callbacks;
  }

  setSettings(settings: Settings): void {
    this.settings = { ...settings };
    if (this.utterance) {
      this.utterance.volume = this.settings.narrationVolume;
    }
  }

  speak(text: string): void {
    this.cancel(false);
    const token = ++this.token;
    this.callbacks.onLineStart(text);

    const synth = window.speechSynthesis;
    const Utterance = window.SpeechSynthesisUtterance;
    if (this.settings.narrationVolume <= 0.01 || !synth || !Utterance) {
      this.scheduleFallback(text, token);
      return;
    }

    try {
      this.audio.setDucked(true);
      const utterance = new Utterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = this.settings.narrationVolume;
      utterance.onend = () => this.finish(token);
      utterance.onerror = () => this.finish(token);
      this.utterance = utterance;
      synth.cancel();
      synth.speak(utterance);
      this.fallbackTimer = window.setTimeout(
        () => this.finish(token),
        Math.max(6000, text.length * 220 + 2000),
      );
    } catch {
      this.audio.setDucked(false);
      this.scheduleFallback(text, token);
    }
  }

  pause(): void {
    this.paused = true;
    if (this.utterance && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    this.paused = false;
    if (this.utterance && window.speechSynthesis) {
      window.speechSynthesis.resume();
    }
  }

  cancel(notify = true): void {
    this.token += 1;
    if (this.fallbackTimer !== null) {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (this.utterance && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Speech synthesis is optional.
      }
    }
    this.utterance = null;
    this.audio.setDucked(false);
    if (notify) {
      this.callbacks.onLineEnd();
    }
  }

  dispose(): void {
    this.cancel(false);
    this.callbacks.onLineEnd();
  }

  private scheduleFallback(text: string, token: number): void {
    const duration = Math.max(4000, text.length * 150);
    if (this.fallbackTimer !== null) window.clearTimeout(this.fallbackTimer);
    this.fallbackTimer = window.setTimeout(() => this.finish(token), duration);
  }

  private finish(token: number): void {
    if (token !== this.token) return;
    if (this.fallbackTimer !== null) {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.utterance = null;
    this.audio.setDucked(false);
    this.callbacks.onLineEnd();
  }
}
