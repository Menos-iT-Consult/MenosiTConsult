'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

async function readResult(response, fallback) {
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || fallback);
    error.code = result.code;
    throw error;
  }
  return result;
}

function quizAvailability(quiz, now) {
  if (quiz.opensAt && new Date(quiz.opensAt).getTime() > now) return 'Opens later';
  if (quiz.closesAt && new Date(quiz.closesAt).getTime() <= now) return 'Closed';
  return 'Available';
}

function deadlineFor(quiz, attempt) {
  return Math.min(
    new Date(attempt.startedAt).getTime() + quiz.durationMinutes * 60000,
    quiz.closesAt ? new Date(quiz.closesAt).getTime() : Infinity
  );
}

export default function QuizCenter({ courseId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuizId, setActiveQuizId] = useState('');
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const queue = useRef(Promise.resolve());
  const submitting = useRef(false);
  const didResume = useRef(false);

  const loadQuizzes = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(
        `/api/academy/student/quizzes?course_id=${encodeURIComponent(courseId)}`,
        { credentials: 'include' }
      );
      const loaded = await readResult(response, 'Could not load quizzes.');
      setQuizzes(loaded);
      if (!didResume.current) {
        const active = loaded.find((quiz) => quiz.activeAttempt);
        if (active) {
          setActiveQuizId(active.id);
          setAnswers(active.activeAttempt.answers || {});
        }
        didResume.current = true;
      }
    } catch (loadError) {
      setError(loadError.message || 'Could not load quizzes.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  const activeQuiz = quizzes.find((quiz) => quiz.id === activeQuizId);
  const activeAttempt = activeQuiz?.activeAttempt;
  const questions = useMemo(() => activeQuiz?.questions || [], [activeQuiz]);

  useEffect(() => {
    if (!activeQuiz || !activeAttempt) return undefined;
    const deadline = deadlineFor(activeQuiz, activeAttempt);
    const updateRemaining = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    updateRemaining();
    const interval = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(interval);
  }, [activeQuiz, activeAttempt]);

  const sendAttemptAction = useCallback(async (action, attemptId, currentAnswers) => {
    const response = await fetch('/api/academy/student/quizzes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, attemptId, answers: currentAnswers }),
    });
    return readResult(response, action === 'save' ? 'Could not save your answer.' : 'Could not submit quiz.');
  }, []);

  const submitAttempt = useCallback(async (quiz, attempt, currentAnswers) => {
    if (!quiz || !attempt || submitting.current) return;
    submitting.current = true;
    setSaving('submit');
    setError('');
    try {
      await queue.current;
      const submitted = await sendAttemptAction('submit', attempt.id, currentAnswers);
      setResult({ ...submitted, title: quiz.title });
      setActiveQuizId('');
      setAnswers({});
      setRemaining(null);
      await loadQuizzes();
    } catch (submitError) {
      if (submitError.code === 'ATTEMPT_EXPIRED') {
        setError(`${submitError.message} Reloading your quiz results.`);
        setActiveQuizId('');
        await loadQuizzes();
      } else {
        setError(submitError.message || 'Could not submit quiz.');
      }
    } finally {
      submitting.current = false;
      setSaving('');
    }
  }, [loadQuizzes, sendAttemptAction]);

  useEffect(() => {
    if (remaining === 0 && activeQuiz && activeAttempt && saving !== 'submit') {
      submitAttempt(activeQuiz, activeAttempt, answers);
    }
  }, [activeAttempt, activeQuiz, answers, remaining, saving, submitAttempt]);

  async function startQuiz(quiz) {
    setSaving(`start-${quiz.id}`);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/academy/student/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'start', quizId: quiz.id }),
      });
      const started = await readResult(response, 'Could not start quiz.');
      setActiveQuizId(quiz.id);
      setAnswers({});
      setQuizzes((current) => current.map((item) => item.id === quiz.id
        ? { ...item, questions: started.questions, activeAttempt: { ...started.attempt, answers: {} } }
        : item));
    } catch (startError) {
      setError(startError.message || 'Could not start quiz.');
    } finally {
      setSaving('');
    }
  }

  function chooseAnswer(questionId, optionId) {
    const updatedAnswers = { ...answers, [questionId]: optionId };
    setAnswers(updatedAnswers);
    if (!activeAttempt) return;
    setError('');
    setSaving('autosave');
    queue.current = queue.current
      .then(() => sendAttemptAction('save', activeAttempt.id, updatedAnswers))
      .catch((saveError) => setError(saveError.message || 'Could not save your answer.'))
      .finally(() => setSaving((current) => current === 'autosave' ? '' : current));
  }

  return (
    <section className="ap-section ap-quiz-center">
      <h2>Quizzes</h2>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {result && (
        <div className="ap-success" role="status">
          <strong>{result.title} submitted.</strong> Score: {result.score}% ({result.correctCount} of {result.totalQuestions} correct).
        </div>
      )}
      {loading ? <p className="ap-muted">Loading quizzes…</p> : !quizzes.length ? (
        <div className="ap-card ap-empty"><p>No quizzes are available for this course yet.</p></div>
      ) : (
        <div className="ap-stack">
          {quizzes.map((quiz) => {
            const attemptCount = quiz.attempts.length + (quiz.activeAttempt ? 1 : 0);
            const availability = quizAvailability(quiz, Date.now());
            const isActive = quiz.id === activeQuizId && quiz.activeAttempt;
            return (
              <article className="ap-card ap-quiz-card" key={quiz.id}>
                <div className="ap-card-heading">
                  <div>
                    <h3>{quiz.title}</h3>
                    {quiz.description && <p>{quiz.description}</p>}
                    <p className="ap-muted">
                      {quiz.durationMinutes} minutes · {quiz.maxAttempts} attempt{quiz.maxAttempts === 1 ? '' : 's'}
                      {quiz.opensAt ? ` · Opens ${new Date(quiz.opensAt).toLocaleString()}` : ''}
                      {quiz.closesAt ? ` · Closes ${new Date(quiz.closesAt).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <span className="ap-chip ap-chip-neutral">{availability}</span>
                </div>
                {isActive ? (
                  <div className="ap-quiz-taking">
                    <div className="ap-quiz-timer" role="timer">
                      Time remaining: {Math.floor((remaining || 0) / 60)}:{String((remaining || 0) % 60).padStart(2, '0')}
                    </div>
                    {questions.map((question, index) => (
                      <fieldset className="ap-quiz-question" key={question.id}>
                        <legend>{index + 1}. {question.prompt}</legend>
                        {question.options.map((option) => (
                          <label className="ap-quiz-option" key={option.id}>
                            <input
                              type="radio"
                              name={`${activeAttempt.id}-${question.id}`}
                              value={option.id}
                              checked={answers[question.id] === option.id}
                              onChange={() => chooseAnswer(question.id, option.id)}
                            />
                            <span>{option.text}</span>
                          </label>
                        ))}
                      </fieldset>
                    ))}
                    <p className="ap-muted" aria-live="polite">
                      {saving === 'autosave' ? 'Saving answers…' : 'Your answers are saved as you go.'}
                    </p>
                    <button
                      className="ap-button ap-button-primary"
                      type="button"
                      onClick={() => submitAttempt(quiz, activeAttempt, answers)}
                      disabled={saving === 'submit'}
                    >
                      {saving === 'submit' ? 'Submitting…' : 'Submit quiz'}
                    </button>
                  </div>
                ) : (
                  <>
                    {quiz.attempts.length > 0 && (
                      <ul className="ap-quiz-attempts">
                        {quiz.attempts.map((attempt) => (
                          <li key={attempt.id}>
                            Attempt {attempt.attemptNumber}: {attempt.score}% ({attempt.correctCount} correct)
                            {attempt.submittedAt ? ` · ${new Date(attempt.submittedAt).toLocaleString()}` : ''}
                          </li>
                        ))}
                      </ul>
                    )}
                    {quiz.activeAttempt ? (
                      <button className="ap-button ap-button-primary" type="button" onClick={() => setActiveQuizId(quiz.id)}>
                        Resume quiz
                      </button>
                    ) : (
                      <button
                        className="ap-button ap-button-primary"
                        type="button"
                        onClick={() => startQuiz(quiz)}
                        disabled={availability !== 'Available' || attemptCount >= quiz.maxAttempts || Boolean(saving)}
                      >
                        {saving === `start-${quiz.id}` ? 'Starting…' : attemptCount >= quiz.maxAttempts ? 'No attempts remaining' : 'Start quiz'}
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
