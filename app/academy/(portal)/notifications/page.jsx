'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export default function StudentNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/academy/student/notifications', { credentials: 'include' });
      const result = await response.json();
      if (response.status === 401) {
        router.replace('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load notifications.');
      setNotifications(result.notifications || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    setSaving(id || 'all');
    setError('');
    try {
      const response = await fetch('/api/academy/student/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(id ? { id } : { all: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update notifications.');
      setNotifications((current) => current.map((item) =>
        !id || item.id === id ? { ...item, isRead: true } : item
      ));
    } catch (saveError) {
      setError(saveError.message || 'Could not update notifications.');
    } finally {
      setSaving('');
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Notifications</h1>
          <p>Updates about your courses, fees, applications, and support requests.</p>
        </div>
        <button
          className="ap-button"
          type="button"
          disabled={!unreadCount || !!saving}
          onClick={() => markRead('')}
        >
          {saving === 'all' ? 'Updating…' : 'Mark all as read'}
        </button>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {loading ? <p>Loading notifications…</p> : notifications.length ? (
        <div className="ap-stack">
          {notifications.map((notification) => (
            <article
              className={`ap-card ap-notification${notification.isRead ? '' : ' is-unread'}`}
              key={notification.id}
            >
              <div className="ap-card-heading">
                <h2>{notification.title}</h2>
                {!notification.isRead && <span className="ap-chip ap-chip-active">New</span>}
              </div>
              <p>{notification.message}</p>
              <div className="ap-notification-footer">
                <small>{formatDate(notification.createdAt)}</small>
                {!notification.isRead && (
                  <button
                    className="ap-link-button"
                    type="button"
                    disabled={!!saving}
                    onClick={() => markRead(notification.id)}
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="ap-card ap-empty">
          <h2>You’re all caught up</h2>
          <p>New Academy updates will appear here.</p>
          <Link className="ap-button" href="/academy/dashboard">Back to dashboard</Link>
        </div>
      )}
    </main>
  );
}
