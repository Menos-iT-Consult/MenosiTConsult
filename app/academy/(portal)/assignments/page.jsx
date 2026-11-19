'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useStudentPortalData from '../useStudentPortalData';

function formatDate(value) {
  if (!value) return 'No deadline set';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function resourceLink(value) {
  return typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value));
}

export default function AssignmentsPage() {
  const { data, loading, error, reload } = useStudentPortalData();
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState('');
  const [submissionErrors, setSubmissionErrors] = useState({});
  const [submissionNotices, setSubmissionNotices] = useState({});

  useEffect(() => {
    if (!data) return;
    setForms(Object.fromEntries((data.assignments || []).map((assignment) => [
      assignment.id,
      {
        text: assignment.submission_text || '',
        file: assignment.submission_file || '',
      },
    ])));
  }, [data]);

  if (loading) return <main className="ap-main"><p>Loading assignments and exams…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const assignments = data.assignments || [];
  const exams = data.exams || [];
  const gradedCourses = (data.enrollments || []).filter(
    (enrollment) => enrollment.total !== null && enrollment.total !== undefined
  );

  async function submitAssignment(assignment) {
    setSaving(assignment.id);
    setSubmissionErrors((current) => ({ ...current, [assignment.id]: '' }));
    setSubmissionNotices((current) => ({ ...current, [assignment.id]: '' }));
    try {
      const response = await fetch('/api/academy/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assignmentId: assignment.id,
          ...(forms[assignment.id] || {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your submission.');
      setSubmissionNotices((current) => ({
        ...current,
        [assignment.id]: response.status === 201 ? 'Assignment submitted.' : 'Submission updated.',
      }));
      await reload();
    } catch (saveError) {
      setSubmissionErrors((current) => ({
        ...current,
        [assignment.id]: saveError.message || 'Could not save your submission.',
      }));
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Assignments & exams</h1>
        <p>Keep track of your due dates, submissions, and results.</p>
      </header>

      <section className="ap-section">
        <h2>Assignments</h2>
        {assignments.length ? (
          <div className="ap-stack">
            {assignments.map((assignment) => {
              const submitted = Boolean(assignment.submission_id);
              const graded = assignment.score !== null && assignment.score !== undefined;
              const deadlinePassed = assignment.due_at && new Date(assignment.due_at).getTime() < Date.now();
              const form = forms[assignment.id] || { text: '', file: '' };
              return (
                <article className="ap-card ap-work-card" key={assignment.id}>
                  <div className="ap-work-heading">
                    <div>
                      <h3>{assignment.title}</h3>
                      <p className="ap-muted">
                        {assignment.course_title || 'Course'} · {assignment.session_name || 'Academy session'}
                      </p>
                    </div>
                    <span className={`ap-chip ${graded ? 'ap-chip-active' : submitted ? 'ap-chip-neutral' : 'ap-chip-pending'}`}>
                      {graded ? 'Graded' : submitted ? 'Submitted' : 'Not submitted'}
                    </span>
                  </div>
                  {assignment.instructions && <p className="ap-work-description">{assignment.instructions}</p>}
                  <div className="ap-work-meta">
                    <span>Due: {formatDate(assignment.due_at)}</span>
                    <span>Max score: {assignment.max_score ?? '—'}</span>
                    {graded && <strong>Score: {assignment.score} / {assignment.max_score}</strong>}
                  </div>
                  {assignment.feedback && (
                    <p className="ap-feedback"><strong>Instructor feedback:</strong> {assignment.feedback}</p>
                  )}
                  {resourceLink(assignment.attachment) && (
                    <a className="ap-resource-link" href={assignment.attachment} target="_blank" rel="noreferrer">
                      Open assignment resource
                    </a>
                  )}
                  {submitted && (
                    <div className="ap-submission-history">
                      <p className="ap-muted">
                        Submitted {formatDate(assignment.submitted_at)}
                      </p>
                      {assignment.submission_text && <p>{assignment.submission_text}</p>}
                      {resourceLink(assignment.submission_file) && (
                        <a className="ap-resource-link" href={assignment.submission_file} target="_blank" rel="noreferrer">
                          Open your submitted resource
                        </a>
                      )}
                    </div>
                  )}
                  {graded ? (
                    <p className="ap-muted">This submission has been graded and can no longer be changed.</p>
                  ) : deadlinePassed ? (
                    <p className="ap-muted">The deadline has passed, so this assignment can no longer accept submissions.</p>
                  ) : (
                    <form
                      className="ap-submission-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitAssignment(assignment);
                      }}
                    >
                      <h4>{submitted ? 'Update your submission' : 'Submit your work'}</h4>
                      <label htmlFor={`submission-text-${assignment.id}`}>Text response</label>
                      <textarea
                        id={`submission-text-${assignment.id}`}
                        className="ap-input ap-textarea"
                        rows={4}
                        maxLength={20000}
                        value={form.text}
                        onChange={(event) => setForms((current) => ({
                          ...current,
                          [assignment.id]: { ...form, text: event.target.value },
                        }))}
                      />
                      <label htmlFor={`submission-file-${assignment.id}`}>Resource URL (optional)</label>
                      <input
                        id={`submission-file-${assignment.id}`}
                        className="ap-input"
                        type="url"
                        maxLength={2048}
                        placeholder="https://"
                        value={form.file}
                        onChange={(event) => setForms((current) => ({
                          ...current,
                          [assignment.id]: { ...form, file: event.target.value },
                        }))}
                      />
                      <button
                        className="ap-button ap-button-primary"
                        type="submit"
                        disabled={saving === assignment.id}
                      >
                        {saving === assignment.id ? 'Saving…' : submitted ? 'Update submission' : 'Submit assignment'}
                      </button>
                      {submissionErrors[assignment.id] && (
                        <p className="ap-error" role="alert">{submissionErrors[assignment.id]}</p>
                      )}
                      {submissionNotices[assignment.id] && (
                        <p className="ap-success" role="status">{submissionNotices[assignment.id]}</p>
                      )}
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>No assignments have been posted for your courses.</p></div>
        )}
      </section>

      <section className="ap-section">
        <h2>Exams</h2>
        {exams.length ? (
          <div className="ap-grid-2">
            {exams.map((exam) => (
              <article className="ap-card" key={exam.id}>
                <span className="ap-eyebrow">{exam.course_title || 'Course'}</span>
                <h3>{exam.title}</h3>
                <p className="ap-card-sub">{formatDate(exam.date)}</p>
                <p>{exam.start_time || 'Time TBA'}{exam.end_time ? ` – ${exam.end_time}` : ''}</p>
                {exam.venue && <p className="ap-muted">Venue: {exam.venue}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>No exams have been scheduled for your courses.</p></div>
        )}
      </section>

      <section className="ap-section">
        <h2>Course grades</h2>
        {gradedCourses.length ? (
          <div className="ap-grid-2">
            {gradedCourses.map((enrollment) => (
              <article className="ap-card" key={enrollment.enrollment_id}>
                <span className="ap-eyebrow">{enrollment.session_name || 'Academy session'}</span>
                <h3>{enrollment.course_title || 'Course'}</h3>
                <p className="ap-grade-result">
                  <strong>{enrollment.letter || '—'}</strong>
                  <span>{enrollment.total} points</span>
                </p>
                <Link
                  href={`/academy/courses/${encodeURIComponent(enrollment.course_id)}`}
                  className="ap-link"
                >
                  View course
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>Your course grades will appear here once they are published.</p></div>
        )}
      </section>
    </main>
  );
}
