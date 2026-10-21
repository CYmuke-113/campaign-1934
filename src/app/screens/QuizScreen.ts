import type { Screen } from '../Screen';
import type { QuizResult } from '../../content/quiz';
import { QUIZ_QUESTIONS, scoreQuiz } from '../../content/quiz';

interface QuizScreenOptions {
  onComplete: (result: QuizResult) => void;
}

export class QuizScreen implements Screen {
  private root: HTMLElement | null = null;
  private index = 0;
  private answers: number[] = [];
  private answered = false;
  private result: QuizResult | null = null;

  constructor(private readonly options: QuizScreenOptions) {}

  mount(root: HTMLElement): void {
    this.root = root;
    this.renderQuestion();
  }

  destroy(): void {
    this.root = null;
  }

  private renderQuestion(): void {
    if (!this.root) return;
    const question = QUIZ_QUESTIONS[this.index];
    const labels = ['A', 'B', 'C', 'D'];
    this.answered = false;

    this.root.innerHTML = `
      <main class="screen quiz-screen" data-testid="quiz-screen">
        <div class="quiz-atmosphere" aria-hidden="true"></div>
        <section class="quiz-shell">
          <header class="quiz-header">
            <p class="eyebrow">飞夺泸定桥 · 战后知识问答</p>
            <h1>回到历史</h1>
            <p class="quiz-progress" data-testid="quiz-progress">第 ${this.index + 1} / ${QUIZ_QUESTIONS.length} 题</p>
          </header>
          <div class="quiz-card">
            <h2 class="quiz-question" data-testid="quiz-question">${question.question}</h2>
            <div class="quiz-options">
              ${question.options
                .map(
                  (option, index) => `
                    <button
                      type="button"
                      class="quiz-option"
                      data-testid="quiz-option-${index}"
                      data-correct="${index === question.correctIndex}"
                    >
                      <span class="quiz-option-label">${labels[index]}</span>
                      <span>${option}</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
            <p class="quiz-explanation" data-testid="quiz-explanation" hidden>
              ${question.explanation}
            </p>
            <div class="quiz-actions">
              <button type="button" class="btn btn-primary" data-testid="quiz-next" disabled>
                ${this.index === QUIZ_QUESTIONS.length - 1 ? '查看结果' : '下一题'}
              </button>
            </div>
          </div>
        </section>
      </main>
    `;

    this.root.querySelectorAll<HTMLButtonElement>('.quiz-option').forEach((button) => {
      button.addEventListener('click', () => this.handleAnswer(Number(button.dataset.testid?.split('-').pop())));
    });
    this.root.querySelector<HTMLButtonElement>('[data-testid="quiz-next"]')?.addEventListener('click', this.handleNext);
  }

  private handleAnswer(index: number): void {
    if (this.answered || !this.root) return;
    this.answered = true;
    this.answers.push(index);
    const question = QUIZ_QUESTIONS[this.index];

    this.root.querySelectorAll<HTMLButtonElement>('.quiz-option').forEach((button, buttonIndex) => {
      button.disabled = true;
      if (buttonIndex === question.correctIndex) {
        button.classList.add('is-correct');
      } else if (buttonIndex === index) {
        button.classList.add('is-wrong');
      }
    });

    const explanation = this.root.querySelector<HTMLElement>('[data-testid="quiz-explanation"]');
    if (explanation) explanation.hidden = false;
    const next = this.root.querySelector<HTMLButtonElement>('[data-testid="quiz-next"]');
    if (next) next.disabled = false;
  }

  private handleNext = (): void => {
    if (!this.answered) return;
    if (this.index < QUIZ_QUESTIONS.length - 1) {
      this.index += 1;
      this.renderQuestion();
      return;
    }
    this.result = scoreQuiz(this.answers);
    this.renderResult();
  };

  private renderResult(): void {
    if (!this.root || !this.result) return;
    this.root.innerHTML = `
      <main class="screen quiz-screen" data-testid="quiz-complete">
        <div class="quiz-atmosphere" aria-hidden="true"></div>
        <section class="quiz-shell quiz-result-shell">
          <p class="eyebrow">飞夺泸定桥 · 战后知识问答</p>
          <h1>问答完成</h1>
          <p class="quiz-score" data-testid="quiz-score">
            答对 <strong>${this.result.correct}</strong> / ${this.result.total}
          </p>
          <p class="quiz-result-copy">
            这段历史不只在战场上，也在每一个记得它的人心里。
          </p>
          <button type="button" class="btn btn-primary btn-large" data-testid="quiz-finish">
            查看战斗结算
          </button>
        </section>
      </main>
    `;
    this.root
      .querySelector<HTMLButtonElement>('[data-testid="quiz-finish"]')
      ?.addEventListener('click', this.handleFinish);
  }

  private handleFinish = (): void => {
    if (this.result) {
      this.options.onComplete(this.result);
    }
  };
}
