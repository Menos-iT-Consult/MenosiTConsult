'use client';

import { useState } from 'react';

function safeResourceUrl(value) {
  return typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value));
}

function formatSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return '';
  return `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
}

export default function CourseLessons({ lessons }) {
  const [items, setItems] = useState(lessons);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const completed = items.filter((lesson) => lesson.completed).length;
  const percentage = items.length ? Math.round((completed / items.length) * 100) : 0;

  async function toggleLesson(lesson) {
    setSaving(lesson.id);
    setError('');
    try {
      const response = await fetch('/api/academy/student/lessons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lessonId: lesson.id, completed: !lesson.completed }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.assign('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not update lesson progress.');
      setItems((current) => current.map((item) =>
        item.id === lesson.id ? { ...item, completed: !lesson.completed } : item
      ));
    } catch (saveError) {
      setError(saveError.message || 'Could not update lesson progress.');
    } finally {
      setSaving('');
    }
  }

  return (
    <section className="ap-section">
      <div className="ap-section-heading">
        <div>
          <h2>Course lessons</h2>
          <p className="ap-muted">{completed} of {items.length} lessons complete</p>
        </div>
        <strong>{percentage}%</strong>
      </div>
      <div
        className="ap-progress-track"
        role="progressbar"
        aria-label="Course lesson progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
      {error && <div className="ap-error" role="alert">{error}</div>}
      <div className="ap-stack ap-lesson-list">
        {items.map((lesson) => (
          <article className="ap-card ap-lesson-card" key={lesson.id}>
            <label className="ap-lesson-toggle">
              <input
                type="checkbox"
                checked={lesson.completed}
                disabled={saving === lesson.id}
                onChange={() => toggleLesson(lesson)}
              />
              <span>
                <strong>{lesson.title}</strong>
                {lesson.lessonDate && <small>{new Date(`${lesson.lessonDate}T12:00:00`).toLocaleDateString()}</small>}
              </span>
            </label>
            {lesson.objectives && <p>{lesson.objectives}</p>}
            {lesson.resources && safeResourceUrl(lesson.resources) && (
              <a className="ap-resource-link" href={lesson.resources} target="_blank" rel="noreferrer">
                Open lesson resource
              </a>
            )}
            {lesson.materials?.length > 0 && (
              <div className="ap-lesson-materials">
                <h3>Lesson materials</h3>
                <ul className="ap-lesson-material-list">
                  {lesson.materials.map((material) => (
                    <li key={material.id}>
                      {material.kind === 'file' && safeResourceUrl(material.downloadUrl) ? (
                        <a href={material.downloadUrl}>{material.title}</a>
                      ) : material.kind === 'link' && safeResourceUrl(material.url) ? (
                        <a href={material.url} target="_blank" rel="noreferrer">{material.title}</a>
                      ) : null}
                      {material.kind === 'file' && <small>{formatSize(material.fileSize)}</small>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
