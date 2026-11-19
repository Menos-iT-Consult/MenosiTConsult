'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/app/components/PasswordInput';

export default function AcademyAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/academy/staff/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign in failed.');
      if (result.role !== 'admin') {
        const logoutResponse = await fetch('/api/academy/staff/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
        if (!logoutResponse.ok) throw new Error('Your account does not have administrator access.');
        throw new Error('Only academy administrators can manage announcements.');
      }
      router.replace('/academy/admin/announcements');
    } catch (loginError) {
      setError(loginError.message || 'Sign in failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="ap-auth">
      <div className="ap-auth-card">
        <div className="ap-auth-logo">
          <img src="/assets/academy-logo-white.png" alt="MITA IT Academy" />
          <h1>Academy announcements</h1>
          <p>Administrator sign in</p>
        </div>
        {error && <div className="ap-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="ap-login-form">
          <label htmlFor="admin-email">Email</label>
          <input
            id="admin-email"
            className="ap-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="admin-password">Password</label>
          <PasswordInput
            id="admin-password"
            className="ap-input"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="ap-button ap-button-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
