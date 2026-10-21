import type { AppState, BattleSummary } from './AppState';
import type { Screen } from './Screen';
import { IntroScreen } from './screens/IntroScreen';
import { OverviewScreen } from './screens/OverviewScreen';
import { BattleLoadingScreen } from './screens/BattleLoadingScreen';
import { BattleScreen } from './screens/BattleScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ErrorScreen } from './screens/ErrorScreen';
import { loadSettings, saveSettings, type Settings } from '../utils/storage';

export class App {
  state: AppState = 'intro';

  private currentScreen: Screen | null = null;
  private summary: BattleSummary | null = null;
  private settings: Settings;

  constructor(private readonly root: HTMLElement) {
    this.settings = loadSettings();
  }

  start(): void {
    this.showIntro();
  }

  getSummary(): BattleSummary | null {
    return this.summary;
  }

  showIntro(): void {
    this.setScreen(
      'intro',
      new IntroScreen({
        onNext: () => this.showOverview(),
      }),
    );
  }

  showOverview(): void {
    this.setScreen(
      'overview',
      new OverviewScreen({
        onSelect: (battleId) => {
          if (battleId === 'luding') this.startBattle();
        },
        onBack: () => this.showIntro(),
      }),
    );
  }

  startBattle(): void {
    this.setScreen(
      'battle-loading',
      new BattleLoadingScreen({
        onReady: () => this.showBattle(),
        onBack: () => this.showOverview(),
      }),
    );
  }

  showBattle(): void {
    this.setScreen(
      'battle',
      new BattleScreen({
        settings: this.settings,
        onVictory: (summary) => {
          this.summary = summary;
          this.showResult();
        },
        onExit: () => this.showOverview(),
        onRestart: () => this.startBattle(),
        onError: (message) => this.showError(message),
        onSettingsChange: (settings) => {
          this.settings = settings;
          saveSettings(settings);
        },
      }),
    );
  }

  showResult(): void {
    const summary = this.summary;
    if (!summary) {
      this.showOverview();
      return;
    }
    this.setScreen(
      'result',
      new ResultScreen({
        summary,
        onReplay: () => this.startBattle(),
        onBack: () => this.showOverview(),
      }),
    );
  }

  showError(message: string): void {
    this.setScreen(
      'error',
      new ErrorScreen({
        message,
        onRetry: () => this.startBattle(),
        onBack: () => this.showOverview(),
      }),
    );
  }

  private setScreen(state: AppState, screen: Screen): void {
    this.currentScreen?.destroy();
    this.root.innerHTML = '';
    this.state = state;
    this.currentScreen = screen;
    screen.mount(this.root);
  }
}
