export interface Screen {
  mount(root: HTMLElement): void;
  destroy(): void;
}
