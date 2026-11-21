'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function AcademySupportAdminPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/academy/admin/support?status=${statusFilter}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load support requests.');
      setTickets(result.tickets || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load support requests.');
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function reply(ticket) {
    const message = (drafts[ticket.id] || '').trim();
    if (!message) return;
    setSaving(ticket.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/academy/admin/support/${encodeURIComponent(ticket.id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send the response.');
      setTickets((current) => current.flatMap((item) => {
        if (item.id !== ticket.id) return [item];
        if (item.status === 'open' && statusFilter === 'open') return [];
        return [{
          ...item,
          status: item.status === 'open' ? 'in_progress' : item.status,
          messages: [...item.messages, result.message],
        }];
      }));
      setDrafts((current) => ({ ...current, [ticket.id]: '' }));
      setNotice(`Response sent to ${ticket.studentName} by email and SMS.`);
    } catch (replyError) {
      setError(replyError.message || 'Could not send the response.');
    } finally {
      setSaving('');
    }
  }

  async function updateStatus(ticket, status) {
    setSaving(ticket.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: ticket.id, status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update request status.');
      if (statusFilter && statusFilter !== status) {
        setTickets((current) => current.filter((item) => item.id !== ticket.id));
      } else {
        setTickets((current) => current.map((item) =>
          item.id === ticket.id ? { ...item, status } : item
        ));
      }
      setNotice(`Support request marked ${status.replace('_', ' ')}.`);
    } catch (updateError) {
      setError(updateError.message || 'Could not update request status.');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Student support</h1>
          <p>Review student requests and reply. Responses are also sent to students by email and SMS.</p>
        </div>
        <label className="ap-filter-field">Show requests
          <select className="ap-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="">All requests</option>
          </select>
        </label>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}
      {loading ? <p>Loading support requests…</p> : tickets.length ? (
        <div className="ap-stack">
          {tickets.map((ticket) => (
            <article className="ap-card ap-admin-ticket" key={ticket.id}>
              <div className="ap-card-heading">
                <div>
                  <h2>{ticket.subject}</h2>
                  <p className="ap-muted">
                    {ticket.studentName} · {ticket.studentNumber} · {ticket.studentEmail}
                  </p>
                </div>
                <span className="ap-chip ap-chip-neutral">{ticket.status.replace('_', ' ')}</span>
              </div>
              <div className="ap-support-messages">
                {ticket.messages.map((message) => (
                  <div className={`ap-support-message is-${message.senderRole}`} key={message.id}>
                    <strong>{message.senderRole === 'admin' ? 'Academy team' : ticket.studentName}</strong>
                    <p>{message.message}</p>
                    <small>{displayDate(message.createdAt)}</small>
                  </div>
                ))}
              </div>
              {ticket.status !== 'resolved' && (
                <form
                  className="ap-support-reply"
                  onSubmit={(event) => { event.preventDefault(); reply(ticket); }}
                >
                  <label htmlFor={`ticket-reply-${ticket.id}`}>Reply to student</label>
                  <textarea
                    id={`ticket-reply-${ticket.id}`}
                    className="ap-input ap-textarea"
                    rows={3}
                    maxLength={4000}
                    minLength={2}
                    value={drafts[ticket.id] || ''}
                    onChange={(event) => setDrafts((current) => ({ ...current, [ticket.id]: event.target.value }))}
                    required
                  />
                  <div className="ap-actions">
                    <button className="ap-button ap-button-primary" type="submit" disabled={saving === ticket.id}>
                      {saving === ticket.id ? 'Sending…' : 'Send response'}
                    </button>
                    <button
                      className="ap-button"
                      type="button"
                      disabled={saving === ticket.id}
                      onClick={() => updateStatus(ticket, 'resolved')}
                    >
                      Resolve request
                    </button>
                  </div>
                </form>
              )}
            </article>
          ))}
        </div>
      ) : <div className="ap-card ap-empty"><p>No requests in this category.</p></div>}
    </main>
  );
}
