'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api';
import { toast, fmtDate } from '../ui';
import MarkdownEditor from '../editor';

const CATEGORIES = ['Security', 'Cloud', 'Network', 'Web Dev', 'Business', 'Tips', 'Software'];

const EMPTY_FORM = {
  title: '',
  slug: '',
  category: 'Security',
  readTime: '',
  excerpt: '',
  content: '',
  featured: false,
};

function slugFromTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function BlogsView({ refreshSignal }) {
  const [blogs, setBlogs] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalHeading, setModalHeading] = useState('New Blog Post');
  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);
  const prevTitleRef = useRef('');

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

  useEffect(() => {
    if (modalOpen && titleRef.current) titleRef.current.focus();
  }, [modalOpen]);

  async function load() {
    setBlogs(null);
    setLoadError(false);
    try {
      const res = await apiFetch('/api/blogs');
      const list = await res.json();
      if (!Array.isArray(list)) {
        setBlogs([]);
        return;
      }
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBlogs(list);
    } catch (err) {
      if (!(err && err.auth)) {
        setBlogs([]);
        setLoadError(true);
        console.error('loadBlogs error:', err);
      }
    }
  }

  async function publish(id) {
    try {
      const res = await apiFetch(`/api/blogs/${id}/publish`, { method: 'PATCH' });
      if (res.ok) {
        toast('Post published!');
        load();
      } else toast('Failed to publish.', 'error');
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  async function unpublish(id) {
    try {
      const res = await apiFetch(`/api/blogs/${id}/unpublish`, { method: 'PATCH' });
      if (res.ok) {
        toast('Post moved to draft.');
        load();
      } else toast('Failed to unpublish.', 'error');
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  async function remove(id) {
    if (!confirm('Are you sure you want to delete this blog post? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/blogs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Post deleted.');
        load();
      } else toast('Failed to delete.', 'error');
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  function openNew() {
    prevTitleRef.current = '';
    setCurrentId(null);
    setModalHeading('New Blog Post');
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  async function openEdit(id) {
    try {
      const res = await apiFetch(`/api/blogs/${id}`);
      if (!res.ok) {
        toast('Failed to load post.', 'error');
        return;
      }
      const blog = await res.json();
      prevTitleRef.current = blog.title || '';
      setCurrentId(id);
      setModalHeading('Edit Blog Post');
      setForm({
        title: blog.title || '',
        slug: blog.slug || '',
        category: blog.category || 'Security',
        readTime: blog.readTime || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        featured: !!blog.featured,
      });
      setModalOpen(true);
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  function close() {
    setModalOpen(false);
    setCurrentId(null);
    setForm(EMPTY_FORM);
    setModalHeading('New Blog Post');
  }

  function onTitleChange(value) {
    const prev = prevTitleRef.current;
    setForm((f) => {
      const next = { ...f, title: value };
      if (!f.slug || f.slug === slugFromTitle(prev)) next.slug = slugFromTitle(value);
      return next;
    });
    prevTitleRef.current = value;
  }

  async function save() {
    if (!form.title.trim()) {
      toast('Title is required.', 'error');
      return;
    }
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      category: form.category,
      readTime: form.readTime.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content,
      featured: form.featured,
    };
    setSaving(true);
    try {
      const res = await apiFetch(currentId ? `/api/blogs/${currentId}` : '/api/blogs', {
        method: currentId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast(currentId ? 'Post updated!' : 'Post created!');
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

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <section id="section-blogs" className="section">
      <div className="section-header">
        <h3>Blog Posts</h3>
        <button className="btn btn-primary" id="new-blog-btn" onClick={openNew}>
          + New Post
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="blogs-tbody">
            {blogs === null ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  Loading...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  Failed to load blog posts.
                </td>
              </tr>
            ) : blogs.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-row">
                  No blog posts yet. Click &quot;+ New Post&quot; to create one.
                </td>
              </tr>
            ) : (
              blogs.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.title || 'Untitled'}</strong>
                    {b.featured ? (
                      <span className="status-pill pill-published" style={{ fontSize: '10px' }}>
                        Featured
                      </span>
                    ) : null}
                  </td>
                  <td>{b.category || '—'}</td>
                  <td>
                    <span className={`status-pill ${b.status === 'published' ? 'pill-published' : 'pill-draft'}`}>{b.status}</span>
                  </td>
                  <td>{fmtDate(b.createdAt)}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(b.id)}>
                        Edit
                      </button>
                      {b.status === 'published' ? (
                        <button className="btn btn-sm btn-secondary" onClick={() => unpublish(b.id)}>
                          Unpublish
                        </button>
                      ) : (
                        <button className="btn btn-sm btn-primary" onClick={() => publish(b.id)}>
                          Publish
                        </button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => remove(b.id)}>
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
        <div id="blog-modal" className="modal">
          <div className="modal-overlay" id="blog-modal-overlay" onClick={close} />
          <div className="modal-dialog modal-large">
            <div className="modal-header">
              <h3 id="modal-title">{modalHeading}</h3>
              <button className="modal-close" id="close-blog-modal" onClick={close}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Title *</label>
                  <input
                    type="text"
                    id="blog-title"
                    ref={titleRef}
                    placeholder="Post title..."
                    required
                    value={form.title}
                    onChange={(e) => onTitleChange(e.target.value)}
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Slug</label>
                  <input type="text" id="blog-slug" placeholder="post-slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category</label>
                  <select id="blog-category" value={form.category} onChange={(e) => set('category', e.target.value)}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Read Time</label>
                  <input type="text" id="blog-readtime" placeholder="5 min read" value={form.readTime} onChange={(e) => set('readTime', e.target.value)} />
                </div>
                <div className="form-group flex-1 checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" id="blog-featured" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                    <span>Featured Post</span>
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Excerpt</label>
                <textarea id="blog-excerpt" rows="2" placeholder="Short description..." value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Content (Markdown)</label>
                <MarkdownEditor value={form.content} onChange={(v) => set('content', v)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" id="cancel-blog-btn" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" id="save-blog-btn" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
