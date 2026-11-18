'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AcademyAnnouncementsAdminPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/academy/admin/announcements', {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.status === 401) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load announcements.');
      setAnnouncements(result.announcements || []);
      setSessions(result.sessions || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load announcements.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  async function createAnnouncement(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, body, sessionId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not publish announcement.');
      setTitle('');
      setBody('');
      setSessionId('');
      setNotice('Announcement published.');
      await loadAnnouncements();
    } catch (saveError) {
      setError(saveError.message || 'Could not publish announcement.');
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    setError('');
    try {
      const response = await fetch('/api/academy/staff/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      router.replace('/academy/admin/login');
    } catch (signOutError) {
      setError(signOutError.message || 'Could not sign out. Please try again.');
    }
  }

  return (
    <div className="ap">
      <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Academy announcements</h1>
          <p>Publish updates for all students or a selected session.</p>
        </div>
        <div className="ap-actions">
          <Link className="ap-button" href="/academy/admin/admissions">Admissions</Link>
          <Link className="ap-button" href="/academy/admin/instructors">Instructor accounts</Link>
          <button className="ap-button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}

      <section className="ap-card ap-section">
        <h2>Publish an announcement</h2>
        <form onSubmit={createAnnouncement} className="ap-announcement-form">
          <label htmlFor="announcement-title">Title</label>
          <input
            id="announcement-title"
            className="ap-input"
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <label htmlFor="announcement-session">Audience</label>
          <select
            id="announcement-session"
            className="ap-select"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
          >
            <option value="">All students</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>{session.name}</option>
            ))}
          </select>
          <label htmlFor="announcement-body">Message</label>
          <textarea
            id="announcement-body"
            className="ap-input ap-textarea"
            maxLength={5000}
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
          <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
            {saving ? 'Publishing…' : 'Publish announcement'}
          </button>
        </form>
      </section>

      <section className="ap-section">
        <h2>Published announcements</h2>
        {loading ? <p>Loading announcements…</p> : announcements.length ? (
          <div className="ap-stack">
            {announcements.map((announcement) => (
              <article className="ap-card" key={announcement.id}>
                <div className="ap-card-heading">
                  <h3>{announcement.title}</h3>
                  <span className={`ap-chip ${announcement.published ? 'ap-chip-active' : 'ap-chip-neutral'}`}>
                    {announcement.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="ap-announcement-body">{announcement.body}</p>
                <small className="ap-muted">
                  {announcement.session_id
                    ? sessions.find((session) => session.id === announcement.session_id)?.name || 'Selected session'
                    : 'All students'}
                  {' · '}
                  {announcement.created_at ? new Date(announcement.created_at).toLocaleString() : ''}
                </small>
              </article>
            ))}
          </div>
        ) : !error ? (
          <div className="ap-card ap-empty"><p>No announcements have been published yet.</p></div>
        ) : null}
      </section>
      </main>
    </div>
  );
}
