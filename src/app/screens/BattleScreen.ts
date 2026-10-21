import type { Screen } from '../Screen';
import type { BattleSummary } from '../AppState';
import type { Settings } from '../../utils/storage';
import { BattleRuntime } from '../../battle/runtime/BattleRuntime';

interface BattleScreenOptions {
  settings: Settings;
  onVictory: (summary: BattleSummary) => void;
  onExit: () => void;
  onRestart: () => void;
  onError: (message: string) => void;
  onSettingsChange: (settings: Settings) => void;
}

export class BattleScreen implements Screen {
  private runtime: BattleRuntime | null = null;
  private failed = false;

  constructor(private readonly options: BattleScreenOptions) {}

  mount(root: HTMLElement): void {
    root.innerHTML = `
      <main class="battle-screen" data-testid="battle-screen">
        <div class="battle-root"></div>
      </main>
    `;
    const host = root.querySelector<HTMLElement>('.battle-root');
    if (!host) {
      this.fail('战斗场景容器创建失败。');
      return;
    }

    try {
      this.runtime = new BattleRuntime(host, {
        settings: this.options.settings,
        onVictory: (summary) => this.options.onVictory(summary),
        onExit: () => this.options.onExit(),
        onRestart: () => this.options.onRestart(),
        onError: (message) => this.fail(message),
        onSettingsChange: (settings) => this.options.onSettingsChange(settings),
      });
      this.runtime.start();
    } catch (error) {
      const message = error instanceof Error ? error.message : '无法初始化 3D 战场。';
      this.fail(message);
    }
  }

  destroy(): void {
    this.runtime?.dispose();
    this.runtime = null;
  }

  private fail(message: string): void {
    if (this.failed) return;
    this.failed = true;
    this.options.onError(message);
  }
}
