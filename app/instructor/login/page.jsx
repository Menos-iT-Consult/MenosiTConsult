'use client';

import { useState } from 'react';
import Link from 'next/link';

function InstructorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    fetch('/api/academy/staff/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) {
          const url = new URL('/instructor', window.location.origin);
          window.location.href = url;
        }
      })
      .catch(() => {});
  }, []);

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
        const url = new URL('/instructor', window.location.origin);
        window.location.href = url;
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
    <div style={{ padding: '2rem' }}>
      <h2>Instructor Login</h2>

      {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            style={{
              width: '100%',
              padding: '10px',
                border: '1px solid #ccc',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: '1rem',
            }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            style={{
              width: '100%',
              padding: '10px',
                border: '1px solid #ccc',
                borderRadius: 8,
                fontFamily: 'inherit',
                fontSize: '1rem',
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
              background: 'var(--blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 500,
              cursor: 'pointer',
          }}
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Sign In'}
        </button>
      </form>

      <p style={{ marginTop: '1rem', fontSize: '.87rem', color: '#64748b' }}>
        Don't have an account? <a href="/instructor/register" style={{ color: 'var(--blue)' }}>Register</a>
      </p>
    </div>
  );
}

export default InstructorLoginPage;