'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/academy/student/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (response.status === 401) {
        router.replace('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not change your password.');
      setSuccess('Your password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (saveError) {
      setError(saveError.message || 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Change password</h1>
        <p>Choose a password with at least 8 characters.</p>
      </header>
      <section className="ap-card ap-password-card">
        {error && <div className="ap-error" role="alert">{error}</div>}
        {success && <div className="ap-success" role="status">{success}</div>}
        <form className="ap-login-form" onSubmit={handleSubmit}>
          <label htmlFor="current-password">Current password</label>
          <input
            id="current-password"
            className="ap-input"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            className="ap-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            className="ap-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
          <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
}
