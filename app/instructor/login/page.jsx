'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/app/components/PasswordInput';

function InstructorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/academy/staff/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) {
          router.replace(data.staff?.role === 'admin'
            ? '/academy/admin/announcements'
            : '/instructor/dashboard');
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/academy/staff/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.role !== 'instructor') {
          await fetch('/api/academy/staff/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
          setError('This account does not have instructor access.');
          setLoading(false);
          return;
        }
        router.replace('/instructor/dashboard');
      } else {
        setError(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="ap-auth">
      <section className="ap-auth-card">
        <header className="ap-auth-logo">
          <img src="/assets/academy-logo-black.png" alt="MITA IT Academy" />
          <h1>Instructor Login</h1>
          <p>Sign in to your teaching workspace</p>
        </header>

        {error && <div className="ap-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} className="ap-login-form">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            className="ap-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            name="password"
            className="ap-input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="ap-button ap-button-primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="ap-auth-foot">
          Instructor accounts are issued by Academy administrators. Use the setup link in your invitation email.
        </p>
      </section>
    </main>
  );
}

export default InstructorLoginPage;