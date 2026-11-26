'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  cancelPrivateAcademyCourseFile,
  uploadPrivateAcademyCourseFile,
} from '../../../lib/academy-upload-client';

const EMPTY_QUESTION = () => ({
  prompt: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  sourceQuestionId: '',
  existingAttachments: [],
  files: [],
});

function localDateTimeValue(value) {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

async function readResult(response, fallback) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

export default function InstructorQuizManager({ courseId, sessions }) {
  const [quizzes, setQuizzes] = useState([]);
  const [form, setForm] = useState({
    sessionId: '',
    title: '',
    description: '',
    durationMinutes: '20',
    maxAttempts: '1',
    opensAt: '',
    closesAt: '',
    published: false,
    attachments: [],
    existingAttachments: [],
    questions: [EMPTY_QUESTION()],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [editingQuizId, setEditingQuizId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadQuizzes = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/academy/instructor/quizzes?course_id=${encodeURIComponent(courseId)}`,
        { credentials: 'include' }
      );
      setQuizzes(await readResult(response, 'Could not load quizzes.'));
    } catch (loadError) {
      setError(loadError.message || 'Could not load quizzes.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

  function updateQuestion(questionIndex, changes) {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...changes } : question
      ),
    }));
  }

  function updateOption(questionIndex, optionIndex, value) {
    const question = form.questions[questionIndex];
    updateQuestion(questionIndex, {
      options: question.options.map((option, index) => index === optionIndex ? value : option),
    });
  }

  async function uploadQuizFile(quizId, file, questionId = '') {
    const uploadKey = await uploadPrivateAcademyCourseFile(file, courseId);
    try {
      const response = await fetch(
        `/api/academy/instructor/quizzes/${encodeURIComponent(quizId)}/attachments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ courseId, uploadKey, fileName: file.name, questionId }),
        }
      );
      return await readResult(response, 'Could not upload quiz file.');
    } catch (uploadError) {
      try {
        await cancelPrivateAcademyCourseFile(courseId, uploadKey);
      } catch (cleanupError) {
        console.error('Academy staged quiz-file cleanup error:', cleanupError);
      }
      throw uploadError;
    }
  }

  async function createQuiz(event) {
    event.preventDefault();
    setSaving('create');
    setError('');
    setNotice('');
    let savedQuiz = false;
    let publishAttempted = false;
    try {
      const isEditing = Boolean(editingQuizId);
      const shouldPublish = !isEditing && form.published;
      const uploadTasks = [
        ...form.attachments.map((file) => ({ file, questionIndex: -1 })),
        ...form.questions.flatMap((question, questionIndex) =>
          question.files.map((file) => ({ file, questionIndex }))
        ),
      ];
      const response = await fetch('/api/academy/instructor/quizzes', {
        method: editingQuizId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: form.sessionId,
          title: form.title,
          description: form.description,
          durationMinutes: Number(form.durationMinutes),
          maxAttempts: Number(form.maxAttempts),
          opensAt: form.opensAt ? new Date(form.opensAt).toISOString() : null,
          closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : null,
          published: shouldPublish && uploadTasks.length === 0,
          questions: form.questions.map((question) => ({
            prompt: question.prompt,
            options: question.options,
            correctIndex: question.correctIndex,
            sourceQuestionId: question.sourceQuestionId || '',
          })),
          quizId: editingQuizId || undefined,
          courseId,
        }),
      });
      const created = await readResult(response, 'Could not create quiz.');
      savedQuiz = true;
      setEditingQuizId(created.id);
      setForm((current) => ({
        ...current,
        published: false,
        questions: current.questions.map((question, index) => ({
          ...question,
          sourceQuestionId: created.questions[index]?.id || question.sourceQuestionId,
          existingAttachments: created.questions[index]?.attachments || question.existingAttachments,
        })),
        existingAttachments: created.attachments || current.existingAttachments,
      }));

      for (let index = 0; index < uploadTasks.length; index += 1) {
        const task = uploadTasks[index];
        const questionId = task.questionIndex < 0
          ? ''
          : created.questions[task.questionIndex]?.id;
        const uploaded = await uploadQuizFile(created.id, task.file, questionId);
        setForm((current) => ({
          ...current,
          attachments: task.questionIndex < 0
            ? current.attachments.filter((file) => file !== task.file)
            : current.attachments,
          existingAttachments: task.questionIndex < 0
            ? [...current.existingAttachments, uploaded]
            : current.existingAttachments,
          questions: current.questions.map((question, questionIndex) => {
            if (questionIndex !== task.questionIndex) return question;
            return {
              ...question,
              files: question.files.filter((file) => file !== task.file),
              existingAttachments: [...question.existingAttachments, uploaded],
            };
          }),
        }));
      }

      if (shouldPublish && uploadTasks.length) {
        publishAttempted = true;
        const publishResponse = await fetch('/api/academy/instructor/quizzes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ quizId: created.id, published: true }),
        });
        await readResult(publishResponse, 'Quiz files were uploaded, but the quiz could not be published.');
        setNotice('Quiz and files published. Enrolled students have been notified.');
      } else {
        setNotice(isEditing
          ? 'Quiz updated. Publish it when it is ready.'
          : created.published
            ? 'Quiz created and published. Enrolled students have been notified.'
            : 'Quiz saved as a draft.');
      }
      setEditingQuizId('');
      setForm((current) => ({
        ...current,
        title: '',
        description: '',
        opensAt: '',
        closesAt: '',
        attachments: [],
        existingAttachments: [],
        questions: [EMPTY_QUESTION()],
      }));
      await loadQuizzes();
    } catch (saveError) {
      if (savedQuiz) {
        const message = publishAttempted
          ? `Quiz and files were saved, but publication could not be confirmed: ${saveError.message || 'Could not publish the quiz.'}`
          : `Quiz saved as a draft, but the remaining file operation failed: ${saveError.message || 'Could not upload quiz files.'}`;
        setError(message);
        await loadQuizzes();
      } else {
        setError(saveError.message || 'Could not create quiz.');
      }
    } finally {
      setSaving('');
    }
  }

  function editQuiz(quiz) {
    setEditingQuizId(quiz.id);
    setError('');
    setNotice('');
    setForm({
      sessionId: quiz.sessionId,
      title: quiz.title,
      description: quiz.description || '',
      durationMinutes: String(quiz.durationMinutes),
      maxAttempts: String(quiz.maxAttempts),
      opensAt: localDateTimeValue(quiz.opensAt),
      closesAt: localDateTimeValue(quiz.closesAt),
      published: false,
      attachments: [],
      existingAttachments: quiz.attachments || [],
      questions: quiz.questions.map((question) => ({
        prompt: question.prompt,
        options: question.options.map((option) => option.text),
        correctIndex: question.options.findIndex((option) => option.id === question.correctOptionId),
        sourceQuestionId: question.id,
        existingAttachments: question.attachments || [],
        files: [],
      })),
    });
    document.querySelector('.ap-quiz-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function setPublished(quiz, published) {
    setSaving(`publish-${quiz.id}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/instructor/quizzes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quizId: quiz.id, published }),
      });
      await readResult(response, 'Could not update quiz publication.');
      setNotice(published ? 'Quiz published and students notified.' : 'Quiz unpublished.');
      await loadQuizzes();
    } catch (updateError) {
      setError(updateError.message || 'Could not update quiz publication.');
    } finally {
      setSaving('');
    }
  }

  return (
    <section className="ap-section">
      <h2>Quizzes and assessments</h2>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}
      <article className="ap-card ap-section">
        <h3>{editingQuizId ? 'Edit quiz draft' : 'Create a multiple-choice quiz'}</h3>
        <form className="ap-form-grid" onSubmit={createQuiz}>
          <label>Session
            <select className="ap-select" value={form.sessionId} onChange={(event) => setForm({ ...form, sessionId: event.target.value })} required>
              <option value="">Select a session</option>
              {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
            </select>
          </label>
          <label>Quiz title
            <input className="ap-input" maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </label>
          <label>Time limit (minutes)
            <input className="ap-input" type="number" min="1" max="240" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} required />
          </label>
          <label>Attempts per student
            <input className="ap-input" type="number" min="1" max="10" value={form.maxAttempts} onChange={(event) => setForm({ ...form, maxAttempts: event.target.value })} required />
          </label>
          <label>Opens (optional)
            <input className="ap-input" type="datetime-local" value={form.opensAt} onChange={(event) => setForm({ ...form, opensAt: event.target.value })} />
          </label>
          <label>Closes (optional)
            <input className="ap-input" type="datetime-local" value={form.closesAt} onChange={(event) => setForm({ ...form, closesAt: event.target.value })} />
          </label>
          <label className="ap-form-wide">Instructions
            <textarea className="ap-input ap-textarea" rows={2} maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label className="ap-form-wide">Quiz-wide files (PDF, TXT, DOCX, PPTX, XLSX, JPEG, PNG, WebP; up to 10 MB each)
            <input
              className="ap-input"
              type="file"
              multiple
              accept=".pdf,.txt,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.webp"
              onChange={(event) => setForm({
                ...form,
                attachments: Array.from(event.target.files || []),
              })}
            />
          </label>
          {form.existingAttachments.length > 0 && (
            <ul className="ap-lesson-material-list ap-form-wide">
              {form.existingAttachments.map((attachment) => (
                <li key={attachment.id}><a href={attachment.downloadUrl}>{attachment.fileName}</a></li>
              ))}
            </ul>
          )}
          <div className="ap-form-wide ap-quiz-editor">
            {form.questions.map((question, questionIndex) => (
              <fieldset className="ap-quiz-question-editor" key={questionIndex}>
                <legend>Question {questionIndex + 1}</legend>
                <label>Question text
                  <textarea className="ap-input ap-textarea" rows={2} maxLength={1000} value={question.prompt} onChange={(event) => updateQuestion(questionIndex, { prompt: event.target.value })} required />
                </label>
                <label>Question files (up to 10 MB each)
                  <input
                    className="ap-input"
                    type="file"
                    multiple
                    accept=".pdf,.txt,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.webp"
                    onChange={(event) => updateQuestion(questionIndex, {
                      files: Array.from(event.target.files || []),
                    })}
                  />
                </label>
                {question.existingAttachments.length > 0 && (
                  <ul className="ap-lesson-material-list">
                    {question.existingAttachments.map((attachment) => (
                      <li key={attachment.id}><a href={attachment.downloadUrl}>{attachment.fileName}</a></li>
                    ))}
                  </ul>
                )}
                {question.options.map((option, optionIndex) => (
                  <label className="ap-quiz-editor-option" key={optionIndex}>
                    <span>Option {optionIndex + 1}</span>
                    <input className="ap-input" maxLength={300} value={option} onChange={(event) => updateOption(questionIndex, optionIndex, event.target.value)} required />
                    <input
                      type="radio"
                      name={`correct-${questionIndex}`}
                      aria-label={`Mark option ${optionIndex + 1} correct`}
                      checked={Number(question.correctIndex) === optionIndex}
                      onChange={() => updateQuestion(questionIndex, { correctIndex: optionIndex })}
                    />
                    <span>Correct</span>
                  </label>
                ))}
                {form.questions.length > 1 && (
                  <button
                    className="ap-link-button"
                    type="button"
                    onClick={() => setForm((current) => ({
                      ...current,
                      questions: current.questions.filter((_, index) => index !== questionIndex),
                    }))}
                  >
                    Remove question
                  </button>
                )}
              </fieldset>
            ))}
            <button
              className="ap-button"
              type="button"
              onClick={() => setForm((current) => ({ ...current, questions: [...current.questions, EMPTY_QUESTION()] }))}
              disabled={form.questions.length >= 50}
            >
              Add question
            </button>
          </div>
          <label className="ap-quiz-publish-check">
            <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} disabled={Boolean(editingQuizId)} />
            {editingQuizId ? 'Save changes as a draft, then publish when ready' : 'Publish immediately and notify enrolled students'}
          </label>
          <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'create' || !form.sessionId}>
            {saving === 'create' ? 'Saving…' : editingQuizId ? 'Save quiz changes' : form.published ? 'Create and publish quiz' : 'Save draft'}
          </button>
          {editingQuizId && (
            <button
              className="ap-button"
              type="button"
              onClick={() => {
                setEditingQuizId('');
                setForm((current) => ({
                  ...current,
                  title: '',
                  description: '',
                  opensAt: '',
                  closesAt: '',
                  published: false,
                  attachments: [],
                  existingAttachments: [],
                  questions: [EMPTY_QUESTION()],
                }));
              }}
            >
              Cancel editing
            </button>
          )}
        </form>
      </article>

      <h3>Quizzes and submissions</h3>
      {loading ? <p className="ap-muted">Loading quizzes…</p> : quizzes.length ? (
        <div className="ap-stack">
          {quizzes.map((quiz) => (
            <article className="ap-card ap-section" key={quiz.id}>
              <div className="ap-card-heading">
                <div>
                  <h3>{quiz.title}</h3>
                  <p className="ap-muted">
                    {sessions.find((session) => session.id === quiz.sessionId)?.name || 'Session'}
                    {` · ${quiz.durationMinutes} minutes · ${quiz.maxAttempts} attempt${quiz.maxAttempts === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="ap-actions">
                  <span className={`ap-chip ${quiz.published ? 'ap-chip-active' : 'ap-chip-neutral'}`}>
                    {quiz.published ? 'Published' : 'Draft'}
                  </span>
                  <button
                    className="ap-button"
                    type="button"
                    onClick={() => setPublished(quiz, !quiz.published)}
                    disabled={saving === `publish-${quiz.id}`}
                  >
                    {quiz.published ? 'Unpublish' : 'Publish'}
                  </button>
                  {!quiz.published && !quiz.attempts.length && (
                    <button className="ap-button" type="button" onClick={() => editQuiz(quiz)}>
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <p>{quiz.questions.length} questions · {quiz.attempts.length} attempt{quiz.attempts.length === 1 ? '' : 's'} started</p>
              {quiz.attachments?.length > 0 && (
                <ul className="ap-lesson-material-list">
                  {quiz.attachments.map((attachment) => (
                    <li key={attachment.id}><a href={attachment.downloadUrl}>{attachment.fileName}</a></li>
                  ))}
                </ul>
              )}
              {quiz.questions.some((question) => question.attachments?.length > 0) && (
                <ul className="ap-lesson-material-list">
                  {quiz.questions.flatMap((question, questionIndex) =>
                    question.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        Question {questionIndex + 1}: <a href={attachment.downloadUrl}>{attachment.fileName}</a>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {quiz.attempts.length ? (
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead><tr><th>Student</th><th>Attempt</th><th>Result</th><th>Status</th><th>Submitted</th></tr></thead>
                    <tbody>
                      {quiz.attempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td>{attempt.studentName}<small>{attempt.studentNumber}</small></td>
                          <td>{attempt.attemptNumber}</td>
                          <td>{attempt.score == null ? '—' : `${attempt.score}% (${attempt.correctCount}/${quiz.questions.length})`}</td>
                          <td>{attempt.status === 'submitted' ? 'Submitted' : 'In progress'}</td>
                          <td>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="ap-muted">No student attempts yet.</p>}
            </article>
          ))}
        </div>
      ) : <div className="ap-card ap-empty"><p>No quizzes have been created for this course.</p></div>}
    </section>
  );
}
