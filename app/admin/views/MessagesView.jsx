'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { toast, fmtDate, fmtDateTime } from '../ui';

export default function MessagesView({ messages, setMessages, setUnread, onOpenMessage, refreshSignal }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function load() {
    setStatus('loading');
    try {
      const res = await apiFetch('/api/messages');
      const msgs = res.ok ? await res.json() : [];
      setMessages(msgs);
      setStatus('ready');
      setUnread(msgs.filter((m) => !m.read).length);
    } catch (err) {
      if (!(err && err.auth)) setStatus('error');
      else console.error('loadMessages error:', err);
    }
  }

  async function markRead(id) {
    try {
      const res = await apiFetch(`/api/messages/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
        load();
      }
    } catch (err) {
      if (!(err && err.auth)) {
        /* silent */
      }
    }
  }

  async function remove(id) {
    if (!confirm('Delete this message? This cannot be undone.')) return;
    try {
      const res = await apiFetch(`/api/messages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast('Message deleted.');
        load();
      } else toast('Failed to delete.', 'error');
    } catch (err) {
      if (!(err && err.auth)) toast('Network error.', 'error');
    }
  }

  const rows = messages;

  return (
    <section id="section-messages" className="section">
      <div className="section-header">
        <h3>Messages</h3>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Service</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="messages-tbody">
            {status === 'loading' ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  Loading...
                </td>
              </tr>
            ) : status === 'error' ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  Failed to load messages.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-row">
                  No messages yet.
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id} className={!m.read ? 'unread-row' : ''} style={{ cursor: 'pointer' }} onClick={() => onOpenMessage(m.id)}>
                  <td>
                    <strong>{m.name}</strong>
                  </td>
                  <td>{m.email}</td>
                  <td>{m.service || '—'}</td>
                  <td>{fmtDate(m.createdAt)}</td>
                  <td>
                    <span className={`status-pill ${m.read ? 'pill-read' : 'pill-unread'}`}>{m.read ? 'Read' : 'Unread'}</span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="action-btns">
                      {!m.read ? (
                        <button className="btn btn-sm btn-secondary" onClick={() => markRead(m.id)}>
                          Mark Read
                        </button>
                      ) : null}
                      <button className="btn btn-sm btn-danger" onClick={() => remove(m.id)}>
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
    </section>
  );
}

export function MessageModal({ message, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!message) return null;

  return (
    <div id="message-modal" className="modal">
      <div className="modal-overlay" id="message-modal-overlay" onClick={() => onClose(true)} />
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>Message Details</h3>
          <button className="modal-close" id="close-message-modal" onClick={() => onClose(true)}>
            &times;
          </button>
        </div>
        <div className="modal-body" id="message-detail-body">
          <div className="msg-detail">
            <div className="msg-field">
              <label>From</label>
              <span>{message.name}</span>
            </div>
            <div className="msg-field">
              <label>Email</label>
              <span>
                <a href={`mailto:${message.email}`} style={{ color: 'var(--blue)' }}>
                  {message.email}
                </a>
              </span>
            </div>
            {message.phone ? (
              <div className="msg-field">
                <label>Phone</label>
                <span>{message.phone}</span>
              </div>
            ) : null}
            {message.service ? (
              <div className="msg-field">
                <label>Service</label>
                <span>{message.service}</span>
              </div>
            ) : null}
            {message.source ? (
              <div className="msg-field">
                <label>Source</label>
                <span>{message.source}</span>
              </div>
            ) : null}
            <div className="msg-field">
              <label>Date</label>
              <span>{fmtDateTime(message.createdAt)}</span>
            </div>
            <div className="msg-field">
              <label>Message</label>
              <div className="msg-body">{message.message}</div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" id="close-msg-btn" onClick={() => onClose(true)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
