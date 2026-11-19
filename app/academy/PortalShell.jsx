'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const PORTALS = {
  student: {
    title: 'MITA Student',
    subtitle: 'Student portal',
    logout: '/api/academy/auth/logout',
    login: '/academy/login',
    links: [
      { href: '/academy/dashboard', label: 'Dashboard', shortLabel: 'D' },
      { href: '/academy/courses', label: 'Courses', shortLabel: 'C' },
      { href: '/academy/assignments', label: 'Assignments & exams', shortLabel: 'A' },
      { href: '/academy/attendance', label: 'Attendance', shortLabel: 'AT' },
      { href: '/academy/timetable', label: 'Timetable', shortLabel: 'T' },
      { href: '/academy/profile', label: 'Profile', shortLabel: 'P' },
    ],
  },
  admin: {
    title: 'MITA Academy',
    subtitle: 'Administrator',
    logout: '/api/academy/staff/auth/logout',
    login: '/academy/admin/login',
    links: [
      { href: '/academy/admin/admissions', label: 'Admissions', shortLabel: 'AD' },
      { href: '/academy/admin/students', label: 'Students', shortLabel: 'ST' },
      { href: '/academy/admin/instructors', label: 'Instructors & courses', shortLabel: 'IC' },
      { href: '/academy/admin/announcements', label: 'Announcements', shortLabel: 'AN' },
    ],
  },
  instructor: {
    title: 'MITA Academy',
    subtitle: 'Instructor portal',
    logout: '/api/academy/staff/auth/logout',
    login: '/instructor/login',
    links: [
      { href: '/instructor/dashboard', label: 'Dashboard', shortLabel: 'D' },
      { href: '/instructor/dashboard#my-courses', label: 'My courses', shortLabel: 'C' },
      { href: '/instructor/dashboard#upcoming-deadlines', label: 'Deadlines', shortLabel: 'DL' },
    ],
  },
};

function isStandaloneRoute(portal, pathname) {
  if (portal === 'admin') return pathname === '/academy/admin/login';
  if (portal === 'instructor') {
    return pathname === '/instructor/login' || pathname === '/instructor/setup';
  }
  return false;
}

export default function PortalShell({ portal, children }) {
  const config = PORTALS[portal];
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const updateHash = () => setActiveHash(window.location.hash);
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      } else if (event.key === 'Tab') {
        const focusable = Array.from(
          sidebarRef.current?.querySelectorAll('a[href], button:not(:disabled)') || []
        ).filter((element) => element.offsetParent !== null);
        if (!focusable?.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector('a[href], button:not(:disabled)')?.focus();
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  if (!config) throw new Error(`Unknown Academy portal: ${portal}`);
  if (isStandaloneRoute(portal, pathname)) return children;

  async function signOut() {
    setSigningOut(true);
    setError('');
    try {
      const response = await fetch(config.logout, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      setMobileOpen(false);
      router.replace(config.login);
    } catch (signOutError) {
      setError(signOutError.message || 'Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  function isActive(link) {
    const [hrefPath, hrefHash] = link.href.split('#');
    if (hrefHash) return pathname === hrefPath && activeHash === `#${hrefHash}`;
    return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  }

  function closeMobileMenu() {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className={`ap ap-shell ap-shell-${portal}${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}>
      <button
        className="ap-sidebar-scrim"
        type="button"
        aria-label="Close navigation menu"
        tabIndex={mobileOpen ? 0 : -1}
        onClick={closeMobileMenu}
      />
      <aside
        ref={sidebarRef}
        id="ap-sidebar"
        className="ap-sidebar"
        aria-label={`${config.subtitle} navigation`}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
      >
        <div className="ap-sidebar-top">
          <Link
            className="ap-sidebar-brand"
            href={config.links[0].href}
            aria-label={config.title}
            onClick={closeMobileMenu}
          >
            <span className="ap-sidebar-logo" aria-hidden="true">M</span>
            <span className="ap-sidebar-brand-copy">
              <strong>{config.title}</strong>
              <small>{config.subtitle}</small>
            </span>
          </Link>
          <button
            className="ap-sidebar-close"
            type="button"
            aria-label="Close navigation menu"
            onClick={closeMobileMenu}
          >
            <span aria-hidden="true">&times;</span>
          </button>
          <button
            className="ap-sidebar-collapse"
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            <span className="ap-sidebar-chevron" aria-hidden="true" />
          </button>
        </div>

        <nav className="ap-sidebar-nav">
          <span className="ap-sidebar-section-label">Workspace</span>
          {config.links.map((link) => {
            const active = isActive(link);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`ap-sidebar-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={collapsed ? link.label : undefined}
                title={collapsed ? link.label : undefined}
                onClick={closeMobileMenu}
              >
                <span className="ap-sidebar-icon" aria-hidden="true">{link.shortLabel}</span>
                <span className="ap-sidebar-label">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ap-sidebar-bottom">
          {error && <p className="ap-sidebar-error" role="alert">{error}</p>}
          <button
            className="ap-sidebar-signout"
            type="button"
            aria-label={collapsed ? 'Sign out' : undefined}
            onClick={signOut}
            disabled={signingOut}
          >
            <span className="ap-sidebar-icon" aria-hidden="true">OUT</span>
            <span className="ap-sidebar-label">{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      <div className="ap-workspace">
        <header className="ap-mobile-header">
          <button
            ref={menuButtonRef}
            className="ap-menu-button"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="ap-sidebar"
            onClick={() => setMobileOpen(true)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
          <Link href={config.links[0].href} className="ap-mobile-brand">{config.title}</Link>
        </header>
        {children}
      </div>
    </div>
  );
}
