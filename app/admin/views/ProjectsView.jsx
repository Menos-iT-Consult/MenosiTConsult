'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, uploadImageFile } from '../api';
import { toast } from '../ui';
import ImagePicker from '../ImagePicker';

const PRJ_CATEGORY_LABELS = {
  network: 'Network',
  security: 'Cybersecurity',
  cloud: 'Cloud',
  webdev: 'Web Dev',
  softdev: 'Software Dev',
  consult: 'Consulting',
  support: 'IT Support',
  data: 'Data',
};

const CATEGORIES = [
  ['network', 'Network'],
  ['security', 'Cybersecurity'],
  ['cloud', 'Cloud'],
  ['webdev', 'Web Dev'],
  ['softdev', 'Software Dev'],
  ['consult', 'Consulting'],
  ['support', 'IT Support'],
  ['data', 'Data'],
];

const EMPTY_FORM = {
  title: '',
  category: 'webdev',
  year: '',
  status: 'published',
  client: '',
  location: '',
  featured: false,
  description: '',
  outcomes: '',
};

export default function ProjectsView({ refreshSignal }) {
  const [projects, setProjects] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHeading, setModalHeading] = useState('New Project');
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  async function load() {
    setProjects(null);
    setLoadError(false);
    try {
      const res = await apiFetch('/api/manage/projects');
      const list = res.ok ? await res.json() : [];
      setProjects(Array.isArray(list) ? list : []);
    } catch (err) {
      if (!(err && err.auth)) {
        setProjects([]);
        setLoadError(true);
        console.error('loadProjects error:', err);
      }
    }
  }

  function openNew() {
    setCurrentId(null);
    setModalHeading('New Project');
    setForm(EMPTY_FORM);
    if (pickerRef.current) pickerRef.current.reset();
    setModalOpen(true);
  }

  function openEdit(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setCurrentId(p.id);
    setModalHeading('Edit Project');
    setForm({
      title: p.title || '',
      category: p.category || 'webdev',
      year: p.year || '',
      status: p.status === 'draft' ? 'draft' : 'published',
      client: p.client || '',
      location: p.location || '',
      featured: !!p.featured,
      description: p.description || '',
      outcomes: Array.isArray(p.outcomes) ? p.outcomes.join('\n') : '',
    });
    if (pickerRef.current) pickerRef.current.set(p.image || '');
    setModalOpen(true);
  }

  function close() {
    setModalOpen(false);
    setCurrentId(null);
    setForm(EMPTY_FORM);
    setModalHeading('New Project');
  }

  async function save() {
    const payload = {
      title: form.title.trim(),
      category: form.category,
      year: form.year.trim(),
      status: form.status,
      client: form.client.trim(),
      location: form.location.trim(),
      featured: form.featured,
      description: form.description.trim(),
      outcomes: form.outcomes.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    if (!payload.title) {
      toast('Project title is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (pickerRef.current && pickerRef.current.pendingFile()) payload.image = await uploadImageFile(pickerRef.current.pendingFile());
      else if (pickerRef.current && pickerRef.current.isRemoved()) payload.image = '';
      const res = await apiFetch(currentId ? `/api/manage/projects/${currentId}` : '/api/manage/projects', {
        method: currentId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast(currentId ? 'Project updated.' : 'Project added.');
        close();
        load();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save.', 'error');
      }
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id) {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const next = p.status === 'published' ? 'draft' : 'published';
    try {
      const res = await apiFetch(`/api/manage/projects/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        toast(next === 'published' ? 'Project published.' : 'Project unpublished.');
        load();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  async function remove(id) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/manage/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Project deleted.');
        load();
      } else toast('Failed to delete.', 'error');
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <section id="section-projects" className="section">
      <div className="section-header">
        <h3>Portfolio Projects</h3>
        <button className="btn btn-primary" id="new-project-btn" onClick={openNew}>
          + New Project
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Client</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="projects-tbody">
            {projects === null ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  Loading...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  Failed to load projects.
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  No projects yet. Click &quot;+ New Project&quot; to add one.
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title || 'Untitled'}</strong>
                    {p.featured ? (
                      <span className="status-pill pill-published" style={{ fontSize: '10px' }}>
                        Featured
                      </span>
                    ) : null}
                    <br />
                    <small style={{ opacity: 0.65 }}>{[p.client, p.location].filter(Boolean).join(' · ')}</small>
                  </td>
                  <td>{PRJ_CATEGORY_LABELS[p.category] || p.category || '—'}</td>
                  <td>{p.client || '—'}</td>
                  <td>
                    <span className={`status-pill ${p.status === 'published' ? 'pill-published' : 'pill-draft'}`}>{p.status}</span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(p.id)}>
                        {p.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p.id)}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(p.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div id="project-modal" className="modal">
          <div className="modal-overlay" id="project-modal-overlay" onClick={close} />
          <div className="modal-dialog modal-large">
            <div className="modal-header">
              <h3 id="project-modal-title">{modalHeading}</h3>
              <button className="modal-close" id="close-project-modal" onClick={close}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Project title *</label>
                <input type="text" id="prj-title" placeholder="Project title..." required value={form.title} onChange={(e) => set('title', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category</label>
                  <select id="prj-category" value={form.category} onChange={(e) => set('category', e.target.value)}>
                    {CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Year</label>
                  <input type="text" id="prj-year" placeholder="2024" value={form.year} onChange={(e) => set('year', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label>Status</label>
                  <select id="prj-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Client</label>
                  <input type="text" id="prj-client" placeholder="Client name" value={form.client} onChange={(e) => set('client', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label>Location</label>
                  <input type="text" id="prj-location" placeholder="Agona, Ghana" value={form.location} onChange={(e) => set('location', e.target.value)} />
                </div>
                <div className="form-group flex-1 checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" id="prj-featured" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                    <span>Featured</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea id="prj-description" rows="4" placeholder="What was done, and the outcome..." value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Outcomes (one per line, max 8)</label>
                <textarea
                  id="prj-outcomes"
                  rows="3"
                  placeholder={'40 % cost saving\nAutomated backups'}
                  value={form.outcomes}
                  onChange={(e) => set('outcomes', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Project image (cover)</label>
                <ImagePicker ref={pickerRef} label="Choose image" alt="Project image preview" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" id="cancel-project-btn" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" id="save-project-btn" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
