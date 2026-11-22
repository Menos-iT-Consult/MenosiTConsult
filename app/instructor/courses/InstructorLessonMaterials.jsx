'use client';

import { useState } from 'react';

async function readResult(response, fallback) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

function formatSize(bytes) {
  if (!Number.isFinite(Number(bytes))) return '';
  return `${Math.max(1, Math.round(Number(bytes) / 1024))} KB`;
}

export default function InstructorLessonMaterials({ courseId, lesson, onChanged }) {
  const [kind, setKind] = useState('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const materials = lesson.materials || [];

  async function addMaterial(event) {
    event.preventDefault();
    setSaving('add');
    setError('');
    try {
      const body = kind === 'link'
        ? JSON.stringify({ courseId, title, url })
        : (() => {
            const form = new FormData();
            form.set('courseId', courseId);
            form.set('title', title);
            form.set('file', file);
            return form;
          })();
      const response = await fetch(
        `/api/academy/instructor/lessons/${encodeURIComponent(lesson.id)}/materials`,
        {
          method: 'POST',
          headers: kind === 'link' ? { 'Content-Type': 'application/json' } : undefined,
          credentials: 'include',
          body,
        }
      );
      const created = await readResult(response, 'Could not add course material.');
      setTitle('');
      setUrl('');
      setFile(null);
      const fileInput = document.getElementById(`lesson-file-${lesson.id}`);
      if (fileInput) fileInput.value = '';
      onChanged(lesson.id, [...materials, created]);
    } catch (saveError) {
      setError(saveError.message || 'Could not add course material.');
    } finally {
      setSaving('');
    }
  }

  async function removeMaterial(material) {
    if (!window.confirm(`Remove "${material.title}" from this lesson?`)) return;
    setSaving(material.id);
    setError('');
    try {
      const response = await fetch(
        `/api/academy/instructor/lessons/${encodeURIComponent(lesson.id)}/materials/${encodeURIComponent(material.id)}`,
        { method: 'DELETE', credentials: 'include' }
      );
      await readResult(response, 'Could not remove course material.');
      onChanged(lesson.id, materials.filter((item) => item.id !== material.id));
    } catch (removeError) {
      setError(removeError.message || 'Could not remove course material.');
    } finally {
      setSaving('');
    }
  }

  return (
    <div className="ap-lesson-materials">
      <h4>Course materials</h4>
      {materials.length ? (
        <ul className="ap-lesson-material-list">
          {materials.map((material) => (
            <li key={material.id}>
              <div>
                {material.kind === 'file' ? (
                  <a href={material.downloadUrl}>{material.title}</a>
                ) : (
                  <a href={material.url} target="_blank" rel="noreferrer">{material.title}</a>
                )}
                {material.kind === 'file' && <small>{material.fileName} · {formatSize(material.fileSize)}</small>}
              </div>
              <button
                className="ap-link-button"
                type="button"
                onClick={() => removeMaterial(material)}
                disabled={Boolean(saving)}
              >
                {saving === material.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="ap-muted">No files or links have been added to this lesson.</p>}

      <form className="ap-lesson-material-form" onSubmit={addMaterial}>
        <label>Add material
          <select className="ap-select" value={kind} onChange={(event) => { setKind(event.target.value); setError(''); }}>
            <option value="link">HTTPS link</option>
            <option value="file">Upload a file</option>
          </select>
        </label>
        <label>Display title
          <input className="ap-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Optional" />
        </label>
        {kind === 'link' ? (
          <label>HTTPS URL
            <input
              className="ap-input"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              maxLength={2048}
              placeholder="https://…"
              required
            />
          </label>
        ) : (
          <label>File (PDF, TXT, DOCX, PPTX, XLSX; max 4 MB)
            <input
              id={`lesson-file-${lesson.id}`}
              className="ap-input"
              type="file"
              accept=".pdf,.txt,.docx,.pptx,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              required
            />
          </label>
        )}
        {error && <div className="ap-error" role="alert">{error}</div>}
        <button className="ap-button" type="submit" disabled={saving === 'add' || (kind === 'file' && !file)}>
          {saving === 'add' ? 'Adding…' : 'Add material'}
        </button>
      </form>
    </div>
  );
}
