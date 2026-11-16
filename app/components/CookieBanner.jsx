'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** Cookie consent banner — identical behaviour to the vanilla version. */
export default function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('mit_cookie_choice')) {
      const t = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (choice) => {
    localStorage.setItem('mit_cookie_choice', choice);
    setShow(false);
  };

  return (
    <div
      className={`cookie-banner${show ? ' show' : ''}`}
      id="cookieBanner"
      role="alertdialog"
      aria-label="Cookie consent"
    >
      <div className="cookie-inner">
        <div className="cookie-text">
          <strong>We use cookies</strong>
          <p>
            We use cookies to improve your experience. By continuing, you accept
            our <Link href="/cookies">Cookie Policy</Link>.
          </p>
        </div>
        <div className="cookie-actions">
          <button
            className="btn btn-ghost btn-sm"
            id="cookieDecline"
            onClick={() => choose('declined')}
          >
            Decline
          </button>
          <button
            className="btn btn-primary btn-sm"
            id="cookieAccept"
            onClick={() => choose('accepted')}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
