import { describe, expect, it } from 'vitest';
import { QUIZ_QUESTIONS, scoreQuiz } from './quiz';

describe('quiz content', () => {
  it('contains exactly five four-option questions', () => {
    expect(QUIZ_QUESTIONS).toHaveLength(5);
    for (const question of QUIZ_QUESTIONS) {
      expect(question.options).toHaveLength(4);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThan(4);
      expect(question.explanation.length).toBeGreaterThan(0);
    }
  });

  it('scores all correct answers', () => {
    expect(
      scoreQuiz(QUIZ_QUESTIONS.map((question) => question.correctIndex)),
    ).toEqual({ correct: 5, total: 5 });
  });

  it('scores wrong answers as incorrect', () => {
    expect(scoreQuiz([0, 0, 0, 0, 0])).toEqual({ correct: 0, total: 5 });
  });
});
