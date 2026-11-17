'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const links = [
  { href: '/academy/dashboard', label: 'Dashboard' },
  { href: '/academy/courses', label: 'Courses' },
  { href: '/academy/assignments', label: 'Assignments & exams' },
  { href: '/academy/timetable', label: 'Timetable' },
  { href: '/academy/profile', label: 'Profile' },
];

export default function StudentPortalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      const response = await fetch('/api/academy/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      router.replace('/academy/login');
    } catch (signOutError) {
      setError(signOutError.message || 'Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }

  return (
    <>
      <header className="ap-nav">
        <div className="ap-nav-inner">
          <Link href="/academy/dashboard" className="ap-brand">MITA Student</Link>
          <nav className="ap-links" aria-label="Student portal">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`ap-link${pathname === link.href ? ' is-active' : ''}`}
                aria-current={pathname === link.href ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <button className="ap-signout" onClick={signOut} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>
      {error && <p className="ap-nav-error" role="alert">{error}</p>}
    </>
  );
}
