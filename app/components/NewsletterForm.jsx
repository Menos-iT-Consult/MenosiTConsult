'use client';

import { useState } from 'react';

/**
 * Newsletter signup form — posts to POST /api/newsletter.
 * Same behaviour as the vanilla handler: disabled while submitting, shows
 * "Subscribed ✓" on success, "Try again" on failure.
 */
export default function NewsletterForm({
  className = 'nl-form',
  id,
  buttonLabel = 'Subscribe',
  buttonClassName = '',
}) {
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [email, setEmail] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        setStatus('done');
        setEmail('');
        setTimeout(() => setStatus('idle'), 3500);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3500);
      }
    } catch {
      alert('Could not subscribe. Please try again later.');
      setStatus('idle');
    }
  };

  const label =
    status === 'sending'
      ? '…'
      : status === 'done'
        ? 'Subscribed ✓'
        : status === 'error'
          ? 'Try again'
          : buttonLabel;

  return (
    <form className={className} id={id} onSubmit={submit}>
      <input
        type="email"
        name="email"
        placeholder="Your email address"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className={buttonClassName} disabled={status === 'sending'}>
        {label}
      </button>
    </form>
  );
}
