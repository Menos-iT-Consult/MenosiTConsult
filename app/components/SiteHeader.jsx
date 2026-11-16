'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const LINKS = [
  { href: '/', label: 'Home', page: 'index' },
  { href: '/about', label: 'About', page: 'about' },
  { href: '/services', label: 'Services', page: 'services' },
  { href: '/portfolio', label: 'Portfolio', page: 'portfolio' },
  { href: '/testimonials', label: 'Testimonials', page: 'testimonials' },
  { href: '/blog', label: 'Blog', page: 'blog' },
  { href: '/contact', label: 'Contact', page: 'contact' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const navRef = useRef(null);
  const [open, setOpen] = useState(false);

  // Active nav link — Blog stays active on article pages (/blog/<slug>)
  let page = pathname.split('/').filter(Boolean).pop() || 'index';
  if (page !== 'blog' && pathname.startsWith('/blog/')) page = 'blog';

  // Navbar scroll behaviour: hide on scroll down past 120px, show on scroll up
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let lastScroll = 0;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 20);
      nav.style.transform =
        y > lastScroll && y > 120 ? 'translateY(-100%)' : 'translateY(0)';
      nav.style.transition =
        'transform .4s cubic-bezier(.25,.46,.45,.94), box-shadow .3s';
      lastScroll = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body scroll lock while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <header className="nav" id="nav" ref={navRef}>
        <div className="nav-inner">
          <Link href="/" className="logo">
            <img
              className="logo-img"
              src="/assets/logo.jpg"
              alt=""
              width="36"
              height="36"
            />
            <span>
              Menos <em>iT</em> Consult
            </span>
          </Link>
          <nav className="nav-links" id="navLinks">
            {LINKS.map((l) => (
              <Link
                key={l.page}
                href={l.href}
                data-page={l.page}
                className={page === l.page ? 'active' : ''}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <a href="tel:+233549128384" className="btn btn-nav">
            Call Now
          </a>
          <button
            className={`burger${open ? ' open' : ''}`}
            id="burger"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div className={`drawer${open ? ' open' : ''}`} id="drawer">
        {LINKS.map((l) => (
          <Link key={l.page} href={l.href}>
            {l.label}
          </Link>
        ))}
        <a href="tel:+233549128384" className="btn btn-primary">
          Call Now
        </a>
      </div>
    </>
  );
}
