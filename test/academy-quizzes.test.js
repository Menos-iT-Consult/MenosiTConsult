const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeQuizInput,
  sanitizeAnswers,
  scoreQuizAttempt,
  publicQuizQuestion,
} = require('../lib/academy-quizzes');

function quizInput(overrides = {}) {
  return {
    title: '  Intro quiz ',
    description: 'Basics',
    courseId: 'course-1',
    sessionId: 'session-1',
    durationMinutes: 20,
    maxAttempts: 2,
    questions: [
      { prompt: 'One plus one?', options: ['One', 'Two'], correctIndex: 1 },
      { prompt: 'Select blue', options: ['Red', 'Blue', 'Green'], correctIndex: 1 },
    ],
    ...overrides,
  };
}

test('quiz input is normalized into stable question and option IDs', () => {
  const normalized = normalizeQuizInput(quizInput());
  assert.equal(normalized.title, 'Intro quiz');
  assert.equal(normalized.questions[0].correctOptionId, 'o2');
  assert.equal(normalized.questions[1].options[1].id, 'o2');
});

test('quiz validation rejects unsafe limits, duplicate options, and invalid windows', () => {
  assert.equal(normalizeQuizInput(quizInput({ durationMinutes: 0 })), null);
  assert.equal(normalizeQuizInput(quizInput({ maxAttempts: 11 })), null);
  assert.equal(normalizeQuizInput(quizInput({
    questions: [{ prompt: 'Pick', options: ['Same', ' same '], correctIndex: 0 }],
  })), null);
  assert.equal(normalizeQuizInput(quizInput({
    opensAt: '2026-01-02T00:00:00Z',
    closesAt: '2026-01-01T00:00:00Z',
  })), null);
});

test('quiz scoring accepts only valid question and option IDs', () => {
  const quiz = normalizeQuizInput(quizInput());
  assert.deepEqual(scoreQuizAttempt(quiz.questions, { q1: 'o2', q2: 'o1' }), {
    answers: { q1: 'o2', q2: 'o1' },
    correctCount: 1,
    totalQuestions: 2,
    score: 50,
  });
  assert.equal(sanitizeAnswers(quiz.questions, { q1: 'not-an-option' }), null);
  assert.equal(sanitizeAnswers(quiz.questions, { q3: 'o1' }), null);
  assert.deepEqual(publicQuizQuestion(quiz.questions[0]), {
    id: 'q1',
    prompt: 'One plus one?',
    options: [{ id: 'o1', text: 'One' }, { id: 'o2', text: 'Two' }],
  });
});
