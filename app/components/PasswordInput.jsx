'use client';

import { useState } from 'react';

export default function PasswordInput({ className = '', style, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-field">
      <input
        {...props}
        className={`password-field-input ${className}`}
        type={visible ? 'text' : 'password'}
        style={{ ...style, paddingRight: style?.paddingRight || '2.75rem' }}
      />
      <button
        type="button"
        className="password-field-toggle"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={props.id}
        onClick={() => setVisible((value) => !value)}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </span>
  );
}
