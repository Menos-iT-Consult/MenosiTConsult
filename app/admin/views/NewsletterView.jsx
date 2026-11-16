'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api';
import { toast, fmtDate } from '../ui';

export default function NewsletterView({ refreshSignal }) {
  const [subs, setSubs] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function load() {
    setSubs(null);
    setLoadError(false);
    try {
      const res = await apiFetch('/api/newsletter/subscribers');
      if (!res.ok) {
        setSubs([]);
        setLoadError(true);
        return;
      }
      const data = await res.json();
      setSubs(data.subscribers || []);
    } catch (err) {
      if (!(err && err.auth)) {
        setSubs([]);
        setLoadError(true);
        console.error('loadNewsletter error:', err);
      }
    }
  }

  async function remove(email) {
    if (!confirm(`Remove ${email} from the newsletter list?`)) return;
    try {
      const res = await apiFetch(`/api/newsletter/subscribers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('Subscriber removed.');
        load();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to remove.', 'error');
      }
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  const count = subs ? subs.length : 0;
  const sorted = subs
    ? subs.slice().sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt))
    : [];

  return (
    <section id="section-newsletter" className="section">
      <div className="section-header">
        <h3>Newsletter Subscribers</h3>
        <div className="header-actions">
          <span id="subscriber-count" className="count-badge">
            {subs ? `${count} subscriber${count !== 1 ? 's' : ''}` : ''}
          </span>
          <button className="btn btn-primary" id="send-tip-btn" onClick={() => setTipOpen(true)}>
            Send Email Tip
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Subscribed Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="newsletter-tbody">
            {subs === null ? (
              <tr>
                <td colSpan="4" className="empty-row">
                  Loading...
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan="4" className="empty-row">
                  Error loading subscribers.
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan="4" className="empty-row">
                  No subscribers yet.
                </td>
              </tr>
            ) : (
              sorted.map((s) => (
                <tr key={s.email}>
                  <td>{[s.firstName, s.lastName].filter(Boolean).join(' ').trim() || '—'}</td>
                  <td>{s.email}</td>
                  <td>{fmtDate(s.subscribedAt)}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(s.email)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {tipOpen && <TipModal onClose={() => setTipOpen(false)} />}
    </section>
  );
}

function TipModal({ onClose }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [testOnly, setTestOnly] = useState(false);
  const [count, setCount] = useState('—');
  const [sending, setSending] = useState(false);
  const subjectRef = useRef(null);

  useEffect(() => {
    let alive = true;
    apiFetch('/api/newsletter/subscribers')
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (!alive) return;
        const n = (data.subscribers || []).length;
        setCount(n ? `${n} subscribers` : '—');
      })
      .catch(() => {
        if (alive) setCount('—');
      });
    const t = setTimeout(() => {
      if (subjectRef.current) subjectRef.current.focus();
    }, 50);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const subj = subject.trim();
    const msg = message.trim();
    if (!subj || !msg) {
      toast('Subject and message are required.', 'error');
      return;
    }
    setSending(true);
    try {
      const res = await apiFetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subj, message: msg, testOnly }),
      });
      const data = await res.json();
      if (data.success) {
        toast(data.message || 'Tip sent!');
        onClose();
      } else {
        const detail = data.errors && data.errors.length ? ` (${data.errors.length} failed)` : '';
        toast((data.message || 'Send failed.') + detail, 'error');
      }
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div id="tip-modal" className="modal">
      <div className="modal-overlay" id="tip-modal-overlay" onClick={onClose} />
      <div className="modal-dialog modal-large">
        <div className="modal-header">
          <h3 id="tip-modal-title">Send Email Tip to Subscribers</h3>
          <button className="modal-close" id="close-tip-modal" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Subject *</label>
            <input
              type="text"
              id="tip-subject"
              ref={subjectRef}
              placeholder="e.g. How to secure your Wi-Fi in 5 minutes"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Message (Markdown supported) *</label>
              <textarea
                id="tip-message"
                rows="10"
                placeholder="Hi {{firstName}}, here's a quick IT tip..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="form-hint">
                Personalise with variables: <code>{'{{firstName}}'}</code> <code>{'{{lastName}}'}</code>{' '}
                <code>{'{{fullName}}'}</code> <code>{'{{email}}'}</code>
              </div>
            </div>
            <div className="form-group flex-1">
              <label className="checkbox-label">
                <input type="checkbox" id="tip-test-only" checked={testOnly} onChange={(e) => setTestOnly(e.target.checked)} />
                <span>Send to myself only (test)</span>
              </label>
              <div className="form-hint">
                Subscribers count: <span id="tip-subscriber-count">{count}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" id="cancel-tip-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" id="send-tip-now-btn" onClick={send} disabled={sending}>
            {sending ? 'Sending…' : 'Send Tip'}
          </button>
        </div>
      </div>
    </div>
  );
}
