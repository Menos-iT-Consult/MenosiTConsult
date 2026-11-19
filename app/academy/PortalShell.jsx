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
      { href: '/academy/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/academy/courses', label: 'Courses', icon: 'courses' },
      { href: '/academy/assignments', label: 'Assignments', icon: 'assignments' },
      { href: '/academy/fees', label: 'Fees', icon: 'fees' },
      { href: '/academy/scholarships', label: 'Scholarships', icon: 'scholarships' },
      { href: '/academy/reports', label: 'Grades & exams', icon: 'reports' },
      { href: '/academy/attendance', label: 'Attendance', icon: 'attendance' },
      { href: '/academy/timetable', label: 'Timetable', icon: 'timetable' },
      {
        href: '/academy/profile',
        label: 'Profile',
        icon: 'profile',
        children: [
          { href: '/academy/profile/id-card', label: 'Student ID Card', icon: 'idCard' },
          { href: '/academy/profile/certificate', label: 'Certificate', icon: 'certificate' },
        ],
      },
    ],
  },
  admin: {
    title: 'MITA Academy',
    subtitle: 'Administrator',
    logout: '/api/academy/staff/auth/logout',
    login: '/academy/admin/login',
    links: [
      { href: '/academy/admin/admissions', label: 'Admissions', icon: 'admissions' },
      { href: '/academy/admin/students', label: 'Students', icon: 'students' },
      { href: '/academy/admin/programs', label: 'Programs & fees', icon: 'courses' },
      { href: '/academy/admin/instructors', label: 'Instructors & courses', icon: 'courses' },
      { href: '/academy/admin/announcements', label: 'Announcements', icon: 'announcements' },
      { href: '/academy/admin/certificates', label: 'Certificates', icon: 'certificate' },
    ],
  },
  instructor: {
    title: 'MITA Academy',
    subtitle: 'Instructor portal',
    logout: '/api/academy/staff/auth/logout',
    login: '/instructor/login',
    links: [
      { href: '/instructor/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { href: '/instructor/dashboard#my-courses', label: 'My courses', icon: 'courses' },
      { href: '/instructor/dashboard#upcoming-deadlines', label: 'Deadlines', icon: 'assignments' },
    ],
  },
};

function NavigationIcon({ name }) {
  const icons = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    courses: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" />
        <path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 10h8" />
      </>
    ),
    assignments: (
      <>
        <path d="M9 4h6M9 3h6v3H9z" />
        <path d="M7 5H5v16h14V5h-2M8 11h8M8 15h8" />
      </>
    ),
    fees: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 9h18M7 14h4M16 13v3M14.5 14.5h3" />
      </>
    ),
    scholarships: (
      <>
        <path d="m12 3 2.4 4.7 5.2.8-3.8 3.7.9 5.2-4.7-2.5-4.7 2.5.9-5.2-3.8-3.7 5.2-.8z" />
        <path d="m8 17-.8 4 4.8-2 4.8 2-.8-4" />
      </>
    ),
    reports: (
      <>
        <path d="M4 20V4M4 20h17" />
        <path d="m7 15 4-4 3 2 5-6M17 7h2v2" />
      </>
    ),
    attendance: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18M8 15l2 2 5-5" />
      </>
    ),
    timetable: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h3M15 14h1" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    idCard: (
      <>
        <rect x="2.5" y="4" width="19" height="16" rx="2" />
        <circle cx="8" cy="10" r="2" />
        <path d="M5 16a3 3 0 0 1 6 0M14 9h4M14 13h4M14 17h3" />
      </>
    ),
    certificate: (
      <>
        <path d="M12 3 15 5l3.5.5.5 3.5 2 3-2 3-.5 3.5L15 19l-3 2-3-2-3.5-.5L5 15l-2-3 2-3 .5-3.5L9 5z" />
        <path d="m9 12 2 2 4-4M9 19l-1 3 4-2 4 2-1-3" />
      </>
    ),
    admissions: (
      <>
        <path d="M4 4h16v16H4zM8 8h8M8 12h5M8 16h4M16 14l2 2 3-4" />
      </>
    ),
    students: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5" />
      </>
    ),
    announcements: (
      <>
        <path d="M4 13h3l11 5V6L7 11H4zM7 13l2 7h4l-2-5M21 9v6" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
      </>
    ),
  };

  return (
    <svg
      className="ap-sidebar-svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icons[name] || icons.dashboard}
    </svg>
  );
}

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
    if (link.children) return pathname === link.href;
    const [hrefPath, hrefHash] = link.href.split('#');
    if (hrefHash) return pathname === hrefPath && activeHash === `#${hrefHash}`;
    return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  }

  function closeMobileMenu() {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <div className={`ap ap-shell ap-shell-${portal}${mobileOpen ? ' is-mobile-open' : ''}`}>
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
        </div>

        <nav className="ap-sidebar-nav">
          <span className="ap-sidebar-section-label">Workspace</span>
          {config.links.map((link) => {
            const active = isActive(link);
            const navLink = (
              <Link
                href={link.href}
                className={`ap-sidebar-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={closeMobileMenu}
              >
                <span className="ap-sidebar-icon"><NavigationIcon name={link.icon} /></span>
                <span className="ap-sidebar-label">{link.label}</span>
              </Link>
            );
            return (
              <div className="ap-sidebar-group" key={link.href}>
                {navLink}
                {link.children && (
                  <div className="ap-sidebar-subnav">
                    {link.children.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`ap-sidebar-sub-link${childActive ? ' is-active' : ''}`}
                          aria-current={childActive ? 'page' : undefined}
                          onClick={closeMobileMenu}
                        >
                          <span className="ap-sidebar-icon"><NavigationIcon name={child.icon} /></span>
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ap-sidebar-bottom">
          {error && <p className="ap-sidebar-error" role="alert">{error}</p>}
          <button
            className="ap-sidebar-signout"
            type="button"
            aria-label="Sign out"
            onClick={signOut}
            disabled={signingOut}
          >
            <span className="ap-sidebar-icon"><NavigationIcon name="logout" /></span>
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
