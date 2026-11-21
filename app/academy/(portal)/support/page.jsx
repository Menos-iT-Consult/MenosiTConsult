'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function displayDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

function statusLabel(status) {
  return status === 'in_progress' ? 'In progress' : status.replace(/^./, (letter) => letter.toUpperCase());
}

export default function StudentSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/academy/student/support', { credentials: 'include' });
      const result = await response.json();
      if (response.status === 401) {
        router.replace('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load support requests.');
      const loaded = result.tickets || [];
      setTickets(loaded);
      setSelectedId((current) => loaded.some((ticket) => ticket.id === current)
        ? current
        : loaded[0]?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'Could not load support requests.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function submitTicket(event) {
    event.preventDefault();
    setSaving('new');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/student/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject, message }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not submit the support request.');
      setTickets((current) => [result.ticket, ...current]);
      setSelectedId(result.ticket.id);
      setSubject('');
      setMessage('');
      setNotice('Your support request has been submitted.');
    } catch (submitError) {
      setError(submitError.message || 'Could not submit the support request.');
    } finally {
      setSaving('');
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!selectedId) return;
    setSaving('reply');
    setError('');
    try {
      const response = await fetch(`/api/academy/student/support/${encodeURIComponent(selectedId)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: reply }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not send your reply.');
      setTickets((current) => current.map((ticket) => ticket.id === selectedId
        ? { ...ticket, status: 'open', messages: [...ticket.messages, result.message] }
        : ticket
      ));
      setReply('');
    } catch (replyError) {
      setError(replyError.message || 'Could not send your reply.');
    } finally {
      setSaving('');
    }
  }

  const selected = tickets.find((ticket) => ticket.id === selectedId);
  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Student help desk</h1>
        <p>Ask the Academy team a question and follow replies to your support requests.</p>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}
      <section className="ap-card ap-section">
        <h2>New support request</h2>
        <form className="ap-form-grid" onSubmit={submitTicket}>
          <label>Subject
            <input
              className="ap-input"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              minLength={5}
              maxLength={120}
              required
            />
          </label>
          <label className="ap-form-wide">How can we help?
            <textarea
              className="ap-input ap-textarea"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={4000}
              required
            />
          </label>
          <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'new'}>
            {saving === 'new' ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </section>

      <section className="ap-section">
        <h2>Your support requests</h2>
        {loading ? <p>Loading requests…</p> : tickets.length ? (
          <div className="ap-support-layout">
            <nav className="ap-card ap-support-ticket-list" aria-label="Your support requests">
              {tickets.map((ticket) => (
                <button
                  type="button"
                  className={`ap-support-ticket-option${ticket.id === selectedId ? ' is-selected' : ''}`}
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                >
                  <strong>{ticket.subject}</strong>
                  <span>{statusLabel(ticket.status)}</span>
                  <small>{displayDate(ticket.updatedAt)}</small>
                </button>
              ))}
            </nav>
            {selected && (
              <article className="ap-card ap-support-conversation">
                <div className="ap-card-heading">
                  <h3>{selected.subject}</h3>
                  <span className="ap-chip ap-chip-neutral">{statusLabel(selected.status)}</span>
                </div>
                <div className="ap-support-messages">
                  {selected.messages.map((item) => (
                    <div className={`ap-support-message is-${item.senderRole}`} key={item.id}>
                      <strong>{item.senderRole === 'admin' ? 'Academy team' : 'You'}</strong>
                      <p>{item.message}</p>
                      <small>{displayDate(item.createdAt)}</small>
                    </div>
                  ))}
                </div>
                <form className="ap-support-reply" onSubmit={sendReply}>
                  <label htmlFor="support-reply">Reply</label>
                  <textarea
                    id="support-reply"
                    className="ap-input ap-textarea"
                    rows={3}
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    minLength={2}
                    maxLength={4000}
                    required
                  />
                  <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'reply'}>
                    {saving === 'reply' ? 'Sending…' : 'Send reply'}
                  </button>
                </form>
              </article>
            )}
          </div>
        ) : !loading ? (
          <div className="ap-card ap-empty"><p>You haven’t submitted a support request yet.</p></div>
        ) : null}
      </section>
    </main>
  );
}
