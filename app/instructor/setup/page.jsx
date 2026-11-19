'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PasswordInput from '@/app/components/PasswordInput';

export default function InstructorSetupPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') || '');
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This invitation link is missing its setup token. Ask an Academy administrator to resend it.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/academy/staff/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not set up your account.');
      setComplete(true);
    } catch (setupError) {
      setError(setupError.message || 'Could not set up your account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ap-auth">
      <section className="ap-auth-card">
        <div className="ap-auth-logo">
          <img src="/assets/academy-logo-white.png" alt="MITA IT Academy" />
          <h1>Set up your instructor account</h1>
          <p>Choose a password to activate your MITA Academy account.</p>
        </div>
        {error && <div className="ap-error" role="alert">{error}</div>}
        {complete ? (
          <div className="ap-success" role="status">
            Your account is active. <Link href="/instructor/login">Sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ap-login-form">
            <label htmlFor="instructor-password">Password</label>
            <PasswordInput
              id="instructor-password"
              className="ap-input"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <label htmlFor="instructor-confirm-password">Confirm password</label>
            <PasswordInput
              id="instructor-confirm-password"
              className="ap-input"
              autoComplete="new-password"
              minLength={8}
              maxLength={200}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <button className="ap-button ap-button-primary" type="submit" disabled={loading || !token}>
              {loading ? 'Setting up…' : 'Activate account'}
            </button>
            {!token && <p className="ap-muted">Checking invitation link…</p>}
          </form>
        )}
      </section>
    </main>
  );
}
