'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EyeIcon } from '../ui';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const userRef = useRef(null);

  useEffect(() => {
    if (userRef.current) userRef.current.focus();
    let alive = true;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (alive && d && d.loggedIn) router.replace('/admin');
      })
      .catch(() => {
        /* server unreachable — let the user try anyway */
      });
    return () => {
      alive = false;
    };
  }, [router]);

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
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid username or password.');
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
          <img className="login-mark" src="/assets/logo-black.png" alt="Menos iT Consult logo" aria-hidden="true" />
          <h1>Menos iT Consult</h1>
          <p>Admin Dashboard — Sign in</p>
        </div>

        <form id="login-form" noValidate onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              ref={userRef}
              placeholder="admin"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="form-group form-group--pw">
            <label htmlFor="password">Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              id="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="pw-toggle"
              id="toggle-pw"
              aria-label={showPw ? 'Hide password' : 'Show password'}
              onClick={() => setShowPw((v) => !v)}
            >
              <EyeIcon />
            </button>
          </div>
          <button type="submit" className="btn btn-primary btn-full" id="login-btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          {error ? (
            <p id="login-error" className="error-msg" role="alert">
              {error}
            </p>
          ) : (
            <p id="login-error" className="error-msg" style={{ display: 'none' }} />
          )}
        </form>

        <p className="login-alt">
          <a href="/">← Back to website</a>
        </p>
      </div>
    </div>
  );
}
