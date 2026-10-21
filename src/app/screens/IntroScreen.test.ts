import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntroScreen } from './IntroScreen';

describe('IntroScreen', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('renders the Long March introduction and the bottom call to action', () => {
    const root = document.querySelector<HTMLElement>('#app');
    if (!root) throw new Error('missing root');

    const screen = new IntroScreen({ onNext: vi.fn() });
    screen.mount(root);

    expect(root.textContent).toContain('长征');
    expect(root.textContent).toContain('1934 年 10 月');
    expect(root.textContent).toContain('进入下一步');

    const actions = root.querySelector('.intro-actions');
    const copy = root.querySelector('.intro-copy');
    expect(actions).not.toBeNull();
    expect(copy).not.toBeNull();
    expect(
      copy!.compareDocumentPosition(actions!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    screen.destroy();
  });

  it('calls onNext when the bottom button is clicked', () => {
    const root = document.querySelector<HTMLElement>('#app');
    if (!root) throw new Error('missing root');
    const onNext = vi.fn();
    const screen = new IntroScreen({ onNext });
    screen.mount(root);

    root.querySelector<HTMLButtonElement>('[data-testid="intro-next"]')!.click();

    expect(onNext).toHaveBeenCalledTimes(1);
    screen.destroy();
  });
});
