import type { Screen } from '../Screen';

interface ErrorScreenOptions {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}

export class ErrorScreen implements Screen {
  private root: HTMLElement | null = null;

  constructor(private readonly options: ErrorScreenOptions) {}

  mount(root: HTMLElement): void {
    this.root = root;
    root.innerHTML = `
      <main class="screen error-screen" data-testid="error-screen">
        <div class="error-shell">
          <p class="eyebrow">无法进入战场</p>
          <h1>加载未完成</h1>
          <p class="error-message">${this.options.message}</p>
          <p class="error-help">请使用最新版 Chrome 或 Edge 浏览器，并确认设备支持 WebGL。</p>
          <div class="error-actions">
            <button type="button" class="btn btn-primary" data-testid="error-retry">重试</button>
            <button type="button" class="btn btn-ghost" data-testid="error-back">返回总览</button>
          </div>
        </div>
      </main>
    `;

    root
      .querySelector<HTMLButtonElement>('[data-testid="error-retry"]')
      ?.addEventListener('click', this.handleRetry);
    root
      .querySelector<HTMLButtonElement>('[data-testid="error-back"]')
      ?.addEventListener('click', this.handleBack);
  }

  destroy(): void {
    this.root
      ?.querySelector<HTMLButtonElement>('[data-testid="error-retry"]')
      ?.removeEventListener('click', this.handleRetry);
    this.root
      ?.querySelector<HTMLButtonElement>('[data-testid="error-back"]')
      ?.removeEventListener('click', this.handleBack);
    this.root = null;
  }

  private handleRetry = (): void => {
    this.options.onRetry();
  };

  private handleBack = (): void => {
    this.options.onBack();
  };
}
