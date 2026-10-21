import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuizScreen } from './QuizScreen';

describe('QuizScreen', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('walks through five questions and reports the score', () => {
    const root = document.querySelector<HTMLElement>('#app');
    if (!root) throw new Error('missing root');
    const onComplete = vi.fn();
    const screen = new QuizScreen({ onComplete });
    screen.mount(root);

    for (let question = 0; question < 5; question += 1) {
      expect(root.querySelector('[data-testid="quiz-question"]')).not.toBeNull();
      root.querySelector<HTMLButtonElement>('[data-correct="true"]')!.click();
      expect(
        root.querySelector<HTMLElement>('[data-testid="quiz-explanation"]')!.hidden,
      ).toBe(false);
      root.querySelector<HTMLButtonElement>('[data-testid="quiz-next"]')!.click();
    }

    expect(root.querySelector('[data-testid="quiz-complete"]')).not.toBeNull();
    expect(root.textContent).toContain('答对');
    expect(root.textContent).toContain('5');

    root.querySelector<HTMLButtonElement>('[data-testid="quiz-finish"]')!.click();
    expect(onComplete).toHaveBeenCalledWith({ correct: 5, total: 5 });
    screen.destroy();
  });

  it('marks a wrong choice and still allows proceeding', () => {
    const root = document.querySelector<HTMLElement>('#app');
    if (!root) throw new Error('missing root');
    const screen = new QuizScreen({ onComplete: vi.fn() });
    screen.mount(root);

    const correct = root.querySelector<HTMLButtonElement>('[data-correct="true"]')!;
    const wrong = root.querySelector<HTMLButtonElement>('[data-correct="false"]')!;
    wrong.click();

    expect(wrong.classList.contains('is-wrong')).toBe(true);
    expect(correct.classList.contains('is-correct')).toBe(true);
    expect(
      root.querySelector<HTMLButtonElement>('[data-testid="quiz-next"]')!.disabled,
    ).toBe(false);

    screen.destroy();
  });
});
