'use client';

import { useSettings } from '@/lib/use-settings';

/**
 * Text node driven by Admin → Settings contact info, with a static fallback.
 * kind: 'location' | 'phone' | 'email' | 'whatsapp'
 */
export default function ContactText({ kind, fallback, as = 'span', className = '' }) {
  const settings = useSettings();
  const contact = settings?.contact || {};
  const value = contact[kind] || fallback;

  if (as === 'a') {
    const href =
      kind === 'email'
        ? `mailto:${value}`
        : kind === 'whatsapp'
          ? `https://wa.me/${String(value || '').replace(/[^0-9]/g, '')}`
          : kind === 'phone'
            ? `tel:${String(value).replace(/\s+/g, '')}`
            : '#';
    return (
      <a href={href} className={className} data-contact={kind}>
        {value}
      </a>
    );
  }
  return (
    <span className={className} data-contact={kind}>
      {value}
    </span>
  );
}
