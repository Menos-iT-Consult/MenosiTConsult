'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, checkAuth } from './api';
import { ToastHost, EyeIcon } from './ui';
import DashboardView from './views/DashboardView';
import BlogsView from './views/BlogsView';
import MessagesView, { MessageModal } from './views/MessagesView';
import NewsletterView from './views/NewsletterView';
import TestimonialsView from './views/TestimonialsView';
import ProjectsView from './views/ProjectsView';
import SettingsView from './views/SettingsView';

const SECTION_TITLES = {
  dashboard: 'Dashboard',
  blogs: 'Blog Posts',
  messages: 'Messages',
  newsletter: 'Newsletter',
  testimonials: 'Testimonials',
  projects: 'Projects',
  settings: 'Settings',
};

const NAV_ICONS = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  blogs: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  messages: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  newsletter: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  testimonials: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  projects: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  settings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const NAV_ITEMS = ['dashboard', 'blogs', 'messages', 'newsletter', 'testimonials', 'projects', 'settings'];

export default function AdminApp() {
  const [authState, setAuthState] = useState('checking');
  const [section, setSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [messages, setMessages] = useState([]);
  const [activeMessage, setActiveMessage] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    checkAuth().then((ok) => setAuthState(ok ? 'in' : 'out'));
  }, []);

  const openMessage = useCallback(
    async (id) => {
      const msg = messages.find((m) => m.id === id);
      if (!msg) return;
      if (!msg.read) {
        try {
          const res = await apiFetch(`/api/messages/${id}/read`, { method: 'PATCH' });
          if (res.ok) {
            setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
            setUnread((u) => Math.max(0, u - 1));
          }
        } catch (err) {
          if (err && err.auth) return;
        }
      }
      setActiveMessage(msg);
    },
    [messages]
  );

  function closeMessageModal(reload) {
    setActiveMessage(null);
    if (reload) setRefreshSignal((s) => s + 1);
  }

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      if (!(err && err.auth)) {
        /* silent */
      }
    }
    setSection('dashboard');
    setAuthState('out');
  }

  function showSection(name) {
    setSection(name);
    setSidebarOpen(false);
  }

  if (authState === 'checking') {
    return (
      <>
        <ToastHost />
      </>
    );
  }

  if (authState === 'out') {
    return (
      <>
        <ToastHost />
        <InlineLogin onSuccess={() => setAuthState('in')} />
      </>
    );
  }

  return (
    <>
      <ToastHost />
      <div id="dashboard-shell">
        <aside className={sidebarOpen ? 'sidebar open' : 'sidebar'}>
          <div className="sidebar-brand">
            <img src="/assets/logo.jpg" alt="" style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
            <span className="brand-text">Menos iT Admin</span>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((name) => (
              <a
                key={name}
                href="#"
                className={section === name ? 'nav-item active' : 'nav-item'}
                data-section={name}
                onClick={(e) => {
                  e.preventDefault();
                  showSection(name);
                }}
              >
                {NAV_ICONS[name]}
                {SECTION_TITLES[name]}
                {name === 'messages' && unread > 0 ? (
                  <span id="unread-badge" className="badge">
                    {unread}
                  </span>
                ) : null}
              </a>
            ))}
          </nav>
          <div className="sidebar-footer">
            <button id="logout-btn" className="btn-logout" onClick={logout}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <button className="sidebar-toggle" id="sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h2 id="page-title">{SECTION_TITLES[section] || section}</h2>
            <div className="topbar-right">
              <span className="admin-label">Admin</span>
            </div>
          </header>

          <main className="content">
            {section === 'dashboard' && (
              <DashboardView refreshSignal={refreshSignal} setUnread={setUnread} setMessages={setMessages} onOpenMessage={openMessage} />
            )}
            {section === 'blogs' && <BlogsView refreshSignal={refreshSignal} />}
            {section === 'messages' && (
              <MessagesView messages={messages} setMessages={setMessages} setUnread={setUnread} onOpenMessage={openMessage} refreshSignal={refreshSignal} />
            )}
            {section === 'newsletter' && <NewsletterView refreshSignal={refreshSignal} />}
            {section === 'testimonials' && <TestimonialsView refreshSignal={refreshSignal} />}
            {section === 'projects' && <ProjectsView refreshSignal={refreshSignal} />}
            {section === 'settings' && <SettingsView refreshSignal={refreshSignal} />}
          </main>
        </div>
      </div>

      <MessageModal message={activeMessage} onClose={closeMessageModal} />
    </>
  );
}

function InlineLogin({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setError('');
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Login failed. Please try again.');
        setBusy(false);
      }
    } catch {
      setError('Network error. Is the server running?');
      setBusy(false);
    }
  }

  return (
    <div id="login-screen">
      <div className="login-box">
        <div className="login-logo">
          <img src="/assets/logo.jpg" alt="Menos iT Consult logo" style={{ width: '54px', height: '54px', margin: '0 auto 12px', display: 'block' }} />
          <h1>Menos iT Consult</h1>
          <p>Admin Dashboard</p>
        </div>
        <form id="login-form" onSubmit={submit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" id="login-username" placeholder="admin" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group form-group--pw">
            <label>Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              id="login-password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="pw-toggle" id="toggle-pw-inline" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw((v) => !v)}>
              <EyeIcon />
            </button>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
          {error ? (
            <p id="login-error" className="error-msg" role="alert">
              {error}
            </p>
          ) : (
            <p id="login-error" className="error-msg" style={{ display: 'none' }} />
          )}
          <p className="login-alt">
            <a href="/admin/login">Open the dedicated login page</a>
          </p>
        </form>
      </div>
    </div>
  );
}
