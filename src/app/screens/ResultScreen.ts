import type { Screen } from '../Screen';
import type { BattleSummary } from '../AppState';
import { RESULT } from '../../content/result';

interface ResultScreenOptions {
  summary: BattleSummary;
  onReplay: () => void;
  onBack: () => void;
}

export class ResultScreen implements Screen {
  private root: HTMLElement | null = null;

  constructor(private readonly options: ResultScreenOptions) {}

  mount(root: HTMLElement): void {
    this.root = root;
    const { summary } = this.options;
    const duration = `${Math.floor(summary.durationSec / 60)}:${String(
      summary.durationSec % 60,
    ).padStart(2, '0')}`;

    root.innerHTML = `
      <main class="screen result-screen">
        <div class="result-atmosphere" aria-hidden="true"></div>
        <div class="result-shell">
          <p class="eyebrow">${RESULT.eyebrow}</p>
          <h1>${RESULT.title}</h1>
          <div class="hero-rule"><span></span></div>
          <p class="result-body">${RESULT.body}</p>
          <section class="result-stats" aria-label="战斗数据">
            <div class="result-stat">
              <span class="result-stat-value">${summary.kills}</span>
              <span class="result-stat-label">击倒敌军</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-value">${summary.deaths}</span>
              <span class="result-stat-label">负伤次数</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-value">${summary.accuracy}%</span>
              <span class="result-stat-label">命中率</span>
            </div>
            <div class="result-stat">
              <span class="result-stat-value">${duration}</span>
              <span class="result-stat-label">参战时长</span>
            </div>
          </section>
          <blockquote class="result-ending">${RESULT.ending}</blockquote>
          <div class="result-actions">
            <button type="button" class="btn btn-primary" data-testid="result-replay">再次体验</button>
            <button type="button" class="btn btn-ghost" data-testid="result-back">返回总览</button>
          </div>
        </div>
      </main>
    `;

    root
      .querySelector<HTMLButtonElement>('[data-testid="result-replay"]')
      ?.addEventListener('click', this.handleReplay);
    root
      .querySelector<HTMLButtonElement>('[data-testid="result-back"]')
      ?.addEventListener('click', this.handleBack);
  }

  destroy(): void {
    this.root
      ?.querySelector<HTMLButtonElement>('[data-testid="result-replay"]')
      ?.removeEventListener('click', this.handleReplay);
    this.root
      ?.querySelector<HTMLButtonElement>('[data-testid="result-back"]')
      ?.removeEventListener('click', this.handleBack);
    this.root = null;
  }

  private handleReplay = (): void => {
    this.options.onReplay();
  };

  private handleBack = (): void => {
    this.options.onBack();
  };
}
