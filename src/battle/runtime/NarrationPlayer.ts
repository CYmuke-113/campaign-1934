import type { Settings } from '../../utils/storage';

export interface NarrationCallbacks {
  onLineStart: (text: string) => void;
  onLineEnd: () => void;
}

/**
 * Text-only narration. It deliberately does not use speech synthesis:
 * historical copy is shown as on-screen text and stays for a readable duration.
 */
export class NarrationPlayer {
  private settings: Settings;
  private readonly callbacks: NarrationCallbacks;
  private timer: number | null = null;
  private remainingMs = 0;
  private startedAt = 0;
  private token = 0;
  private active = false;
  private paused = false;

  constructor(settings: Settings, callbacks: NarrationCallbacks) {
    this.settings = { ...settings };
    this.callbacks = callbacks;
  }

  setSettings(settings: Settings): void {
    this.settings = { ...settings };
  }

  speak(text: string): void {
    this.cancel(false);
    const token = ++this.token;
    this.callbacks.onLineStart(text);
    this.active = true;
    this.paused = false;
    this.remainingMs = Math.max(5000, text.length * 110);
    this.startedAt = performance.now();
    this.schedule(token);
  }

  pause(): void {
    if (!this.active || this.paused) return;
    this.paused = true;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.remainingMs = Math.max(0, this.remainingMs - (performance.now() - this.startedAt));
  }

  resume(): void {
    if (!this.active || !this.paused) return;
    this.paused = false;
    this.startedAt = performance.now();
    this.schedule(this.token);
  }

  cancel(notify = true): void {
    this.token += 1;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.active = false;
    this.paused = false;
    if (notify) {
      this.callbacks.onLineEnd();
    }
  }

  dispose(): void {
    this.cancel(false);
    this.callbacks.onLineEnd();
  }

  private schedule(token: number): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      if (token !== this.token) return;
      this.timer = null;
      this.active = false;
      this.callbacks.onLineEnd();
    }, this.remainingMs);
  }
}
