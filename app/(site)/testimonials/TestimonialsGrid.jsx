'use client';

import { useEffect, useState } from 'react';
import Reveal from '@/app/components/Reveal';

/* Static fallback cards (converted from the original testimonials.html markup).
   Rendered until/unless the admin API returns published testimonials. */
const FALLBACK_TESTIMONIALS = [
  {
    quote:
      'Menos iT completely transformed our network infrastructure. We went from constant downtime to zero interruptions in six months. The team was professional, communicative, and delivered exactly what they promised.',
    name: 'Baffour Kofi',
    role: 'Owner',
    company: 'KAB Enterprises',
    location: 'Network Design',
    rating: 5,
    h: 210,
  },
  {
    quote:
      'Their cybersecurity audit uncovered vulnerabilities we had no idea about. The team explained everything clearly and in plain language. Fixed issues quickly and gave us a roadmap to stay protected going forward.',
    name: 'Abena Sarpong',
    role: 'Director',
    company: 'Sarpong & Co.',
    location: 'Cybersecurity',
    rating: 5,
    h: 160,
  },
  {
    quote:
      "Moving our data to the cloud was something we'd been putting off for years. Menos iT made it completely painless and actually saved us money on monthly IT costs. Couldn't recommend them highly enough.",
    name: 'Kweku Mensah',
    role: 'MD',
    company: 'Mensah Logistics',
    location: 'Cloud Solutions',
    rating: 5,
    h: 280,
  },
  {
    quote:
      'We had a network failure on a Friday evening. Menos iT had someone on the phone within 20 minutes and we were back up by Saturday morning. That kind of responsiveness is rare and we really value it.',
    name: 'Emmanuel Asante',
    role: 'Operations Manager',
    company: 'Asante Trading',
    location: 'IT Support',
    rating: 5,
    h: 25,
  },
  {
    quote:
      'The IT consulting session alone was worth every pesewa. They came in, assessed our setup, and gave us a clear, prioritised action plan. No fluff, no upselling — just honest advice we could act on immediately.',
    name: 'Yaa Boateng',
    role: 'CEO',
    company: 'Boateng Medical Centre',
    location: 'IT Consulting',
    rating: 5,
    h: 340,
  },
  {
    quote:
      'We brought them in for data management. They cleaned up years of disorganised files, set up automated backups, and built us a simple dashboard. Our team saves hours every week now. Excellent work.',
    name: 'Fiifi Antwi',
    role: 'Finance Director',
    company: 'Antwi Group',
    location: 'Data Management',
    rating: 5,
    h: 200,
  },
];

/* Same char-code hash as site-content.js */
function hueFor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

function initialsOf(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return parts.slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');
}

function TestimonialCard({ t, injected = false }) {
  const n = Math.max(1, Math.min(5, Number(t.rating) || 5));
  const meta = [t.role, t.company].filter(Boolean).join(', ');
  const where = t.location ? ` · ${t.location}` : '';
  const avatar = t.image ? (
    <img className="tcard-av tcard-av-img" src={t.image} alt={t.name} loading="lazy" />
  ) : (
    <div className="tcard-av" style={{ '--h': t.h ?? hueFor(t.name || 'm') }}>
      {initialsOf(t.name)}
    </div>
  );

  const inner = (
    <>
      <div className="tcard-stars">
        {'★'.repeat(n)}
        {n < 5 && <span style={{ opacity: 0.25 }}>{'★'.repeat(5 - n)}</span>}
      </div>
      <p>&quot;{t.quote}&quot;</p>
      <div className="tcard-author">
        {avatar}
        <div>
          <strong>{t.name}</strong>
          <span>
            {meta}
            {where}
          </span>
        </div>
      </div>
    </>
  );

  if (injected) {
    /* Admin-managed card (ported from renderTestimonial in site-content.js) */
    return <div className="tcard reveal visible">{inner}</div>;
  }
  return (
    <Reveal as="div" className="tcard">
      {inner}
    </Reveal>
  );
}

export default function TestimonialsGrid() {
  const [items, setItems] = useState(null); // null = keep static fallback

  useEffect(() => {
    let alive = true;
    fetch('/api/content/testimonials', { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((list) => {
        if (alive && Array.isArray(list) && list.length > 0) setItems(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const injected = items !== null;
  const list = items || FALLBACK_TESTIMONIALS;

  return (
    <div className="testi-full-grid" id="testiGrid">
      {list.map((t, i) => (
        <TestimonialCard key={i} t={t} injected={injected} />
      ))}
    </div>
  );
}
