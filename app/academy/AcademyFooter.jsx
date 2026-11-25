'use client';

import Link from 'next/link';
import useAcademySiteSettings from './useAcademySiteSettings';

const SOCIAL_LINKS = [
  ['facebook', 'Facebook'],
  ['instagram', 'Instagram'],
  ['linkedin', 'LinkedIn'],
  ['youtube', 'YouTube'],
  ['tiktok', 'TikTok'],
];

function safeSocialUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export default function AcademyFooter() {
  const { settings, error } = useAcademySiteSettings();
  const whatsapp = settings.whatsapp.replace(/\D/g, '');

  return (
    <footer className="academy-footer">
      <div className="academy-container academy-footer-inner">
        <div className="academy-footer-brand">
          <Link className="academy-brand academy-brand-footer" href="/academy">
            <img src="/assets/academy-logo-black.png" alt="MITA IT Academy" />
          </Link>
          <p>Building practical skills for a connected world.</p>
        </div>
        <div className="academy-footer-contact">
          <h2>Contact the Academy</h2>
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
          {settings.phone && <a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`}>{settings.phone}</a>}
          <Link href="/contact">Contact page</Link>
        </div>
        <nav className="academy-footer-socials" aria-label="Academy social media">
          {SOCIAL_LINKS.map(([field, label]) => {
            const href = safeSocialUrl(settings[field]);
            return href ? (
              <a key={field} href={href} target="_blank" rel="noopener noreferrer">
                {label}
              </a>
            ) : null;
          })}
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
              WhatsApp
            </a>
          )}
        </nav>
        {error && <p className="academy-footer-error" role="status">{error}</p>}
        <div className="academy-footer-legal">
          <Link href="/academy/terms">Terms</Link>
          <Link href="/academy/privacy">Privacy</Link>
          <small>© {new Date().getFullYear()} Menos iT Consult. All rights reserved.</small>
        </div>
      </div>
    </footer>
  );
}
