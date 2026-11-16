'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch, uploadImageFile } from '../api';
import { toast, Stars } from '../ui';
import ImagePicker from '../ImagePicker';

const EMPTY_FORM = {
  name: '',
  role: '',
  company: '',
  location: '',
  rating: '5',
  status: 'published',
  featured: false,
  quote: '',
};

export default function TestimonialsView({ refreshSignal }) {
  const [testimonials, setTestimonials] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHeading, setModalHeading] = useState('New Testimonial');
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
    setTestimonials(null);
    setLoadError(false);
    try {
      const res = await apiFetch('/api/manage/testimonials');
      const list = res.ok ? await res.json() : [];
      setTestimonials(Array.isArray(list) ? list : []);
    } catch (err) {
      if (!(err && err.auth)) {
        setTestimonials([]);
        setLoadError(true);
        console.error('loadTestimonials error:', err);
      }
    }
  }

  function openNew() {
    setCurrentId(null);
    setModalHeading('New Testimonial');
    setForm(EMPTY_FORM);
    if (pickerRef.current) pickerRef.current.reset();
    setModalOpen(true);
  }

  function openEdit(id) {
    const t = testimonials.find((x) => x.id === id);
    if (!t) return;
    setCurrentId(t.id);
    setModalHeading('Edit Testimonial');
    setForm({
      name: t.name || '',
      role: t.role || '',
      company: t.company || '',
      location: t.location || '',
      rating: String(Math.max(1, Math.min(5, Number(t.rating) || 5))),
      status: t.status === 'draft' ? 'draft' : 'published',
      featured: !!t.featured,
      quote: t.quote || '',
    });
    if (pickerRef.current) pickerRef.current.set(t.image || '');
    setModalOpen(true);
  }

  function close() {
    setModalOpen(false);
    setCurrentId(null);
    setForm(EMPTY_FORM);
    setModalHeading('New Testimonial');
  }

  async function save() {
    const payload = {
      name: form.name.trim(),
      role: form.role.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      rating: Number(form.rating) || 5,
      status: form.status,
      featured: form.featured,
      quote: form.quote.trim(),
    };
    if (!payload.name || !payload.quote) {
      toast('Name and quote are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (pickerRef.current && pickerRef.current.pendingFile()) payload.image = await uploadImageFile(pickerRef.current.pendingFile());
      else if (pickerRef.current && pickerRef.current.isRemoved()) payload.image = '';
      const res = await apiFetch(
        currentId ? `/api/manage/testimonials/${currentId}` : '/api/manage/testimonials',
        {
          method: currentId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        toast(currentId ? 'Testimonial updated.' : 'Testimonial added.');
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
    const t = testimonials.find((x) => x.id === id);
    if (!t) return;
    const next = t.status === 'published' ? 'draft' : 'published';
    try {
      const res = await apiFetch(`/api/manage/testimonials/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        toast(next === 'published' ? 'Testimonial published.' : 'Testimonial unpublished.');
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
    if (!confirm('Delete this testimonial? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/manage/testimonials/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Testimonial deleted.');
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
    <section id="section-testimonials" className="section">
      <div className="section-header">
        <h3>Testimonials</h3>
        <button className="btn btn-primary" id="new-testimonial-btn" onClick={openNew}>
          + New Testimonial
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Company</th>
              <th>Rating</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="testimonials-tbody">
            {testimonials === null ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  Loading...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  Failed to load testimonials.
                </td>
              </tr>
            ) : testimonials.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  No testimonials yet. Click &quot;+ New Testimonial&quot; to add one.
                </td>
              </tr>
            ) : (
              testimonials.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                    {t.featured ? (
                      <span className="status-pill pill-published" style={{ fontSize: '10px' }}>
                        Featured
                      </span>
                    ) : null}
                    <br />
                    <small style={{ opacity: 0.65 }}>{[t.role, t.company].filter(Boolean).join(' · ')}</small>
                  </td>
                  <td>{t.company || '—'}</td>
                  <td>
                    <Stars value={t.rating} />
                  </td>
                  <td>
                    <span className={`status-pill ${t.status === 'published' ? 'pill-published' : 'pill-draft'}`}>{t.status}</span>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-secondary" onClick={() => toggleStatus(t.id)}>
                        {t.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(t.id)}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(t.id)}>
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
        <div id="testimonial-modal" className="modal">
          <div className="modal-overlay" id="testimonial-modal-overlay" onClick={close} />
          <div className="modal-dialog modal-large">
            <div className="modal-header">
              <h3 id="testimonial-modal-title">{modalHeading}</h3>
              <button className="modal-close" id="close-testimonial-modal" onClick={close}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Name *</label>
                  <input type="text" id="tst-name" placeholder="Client full name" required value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label>Role / Title</label>
                  <input type="text" id="tst-role" placeholder="Owner, Manager..." value={form.role} onChange={(e) => set('role', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Company</label>
                  <input type="text" id="tst-company" placeholder="Company name" value={form.company} onChange={(e) => set('company', e.target.value)} />
                </div>
                <div className="form-group flex-1">
                  <label>Location</label>
                  <input type="text" id="tst-location" placeholder="Takoradi, Ghana" value={form.location} onChange={(e) => set('location', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Rating</label>
                  <select id="tst-rating" value={form.rating} onChange={(e) => set('rating', e.target.value)}>
                    <option value="5">★★★★★ (5)</option>
                    <option value="4">★★★★ (4)</option>
                    <option value="3">★★★ (3)</option>
                    <option value="2">★★ (2)</option>
                    <option value="1">★ (1)</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Status</label>
                  <select id="tst-status" value={form.status} onChange={(e) => set('status', e.target.value)}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="form-group flex-1 checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" id="tst-featured" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                    <span>Featured</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Quote *</label>
                <textarea id="tst-quote" rows="5" placeholder="What the client said..." required value={form.quote} onChange={(e) => set('quote', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Profile photo</label>
                <ImagePicker ref={pickerRef} label="Choose photo" alt="Profile photo preview" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" id="cancel-testimonial-btn" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" id="save-testimonial-btn" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Testimonial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
