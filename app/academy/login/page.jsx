'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/app/components/PasswordInput';

export default function StudentLoginPage() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/academy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Login failed.');
      router.replace('/academy/dashboard');
    } catch (loginError) {
      setError(loginError.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="ap-auth">
      <div className="ap-auth-card">
        <div className="ap-auth-logo">
          <img src="/assets/academy-logo-white.png" alt="MITA IT Academy" />
          <h1>MITA Student Login</h1>
          <p>Menos iT Consult Academy</p>
        </div>
        {error && <div className="ap-error" role="alert">{error}</div>}
        <form onSubmit={handleSubmit} className="ap-login-form">
          <label htmlFor="studentId">Student ID</label>
          <input
            id="studentId"
            className="ap-input"
            autoComplete="username"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            required
          />
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
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
        <p className="ap-auth-foot">
          Need help accessing your account? Contact the academy office.
        </p>
      </div>
    </main>
  );
}
