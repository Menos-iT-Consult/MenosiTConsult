'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { fmtDate } from '../ui';

export default function DashboardView({ refreshSignal, setUnread, setMessages, onOpenMessage }) {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  async function load() {
    try {
      const [blogsRes, msgsRes, subsRes] = await Promise.all([
        apiFetch('/api/blogs'),
        apiFetch('/api/messages'),
        apiFetch('/api/newsletter/subscribers'),
      ]);

      const blogs = blogsRes.ok ? await blogsRes.json() : [];
      const msgs = msgsRes.ok ? await msgsRes.json() : [];
      const subs = subsRes.ok ? await subsRes.json() : { subscribers: [], count: 0 };

      const unreadCount = msgs.filter((m) => !m.read).length;

      setStats({
        blogs: blogs.length,
        published: blogs.filter((b) => b.status === 'published').length,
        messages: msgs.length,
        unread: unreadCount,
        subscribers: subs.count || (subs.subscribers || []).length,
      });
      setUnread(unreadCount);
      setMessages(msgs);
      setRecent(msgs.slice(0, 5));
    } catch (err) {
      if (!(err && err.auth)) console.error('loadDashboard error:', err);
    }
  }

  return (
    <section id="section-dashboard" className="section">
      <div className="stat-grid">
        <div className="stat-card accent-blue">
          <div className="stat-value">{stats ? stats.blogs : '-'}</div>
          <div className="stat-label">Total Blog Posts</div>
        </div>
        <div className="stat-card accent-green">
          <div className="stat-value">{stats ? stats.published : '-'}</div>
          <div className="stat-label">Published Posts</div>
        </div>
        <div className="stat-card accent-orange">
          <div className="stat-value">{stats ? stats.messages : '-'}</div>
          <div className="stat-label">Total Messages</div>
        </div>
        <div className="stat-card accent-red">
          <div className="stat-value">{stats ? stats.unread : '-'}</div>
          <div className="stat-label">Unread Messages</div>
        </div>
        <div className="stat-card accent-purple">
          <div className="stat-value">{stats ? stats.subscribers : '-'}</div>
          <div className="stat-label">Newsletter Subscribers</div>
        </div>
      </div>
      <div className="recent-section">
        <h3>Recent Messages</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="recent-messages-tbody">
              {recent === null ? (
                <tr>
                  <td colSpan="5" className="empty-row">
                    Loading...
                  </td>
                </tr>
              ) : recent.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-row">
                    No messages yet.
                  </td>
                </tr>
              ) : (
                recent.map((m) => (
                  <tr
                    key={m.id}
                    className={!m.read ? 'unread-row' : ''}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onOpenMessage(m.id)}
                  >
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.service || '—'}</td>
                    <td>{fmtDate(m.createdAt)}</td>
                    <td>
                      <span className={`status-pill ${m.read ? 'pill-read' : 'pill-unread'}`}>{m.read ? 'Read' : 'Unread'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
