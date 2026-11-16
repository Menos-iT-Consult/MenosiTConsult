'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Reveal from '@/app/components/Reveal';

const CAT_LABELS = {
  network: 'Network',
  security: 'Cybersecurity',
  cloud: 'Cloud',
  webdev: 'Web Dev',
  softdev: 'Software Dev',
  consult: 'Consulting',
  support: 'IT Support',
  data: 'Data',
};

/* Compact line-art illustrations, one per category (site's stroke style).
   Ported from site-content.js CAT_SVGS. */
const CAT_SVGS = {
  network: (
    <>
      <rect x="4" y="10" width="40" height="28" rx="3" />
      <path d="M4 20h40M14 38v6M34 38v6M10 44h28" />
      <circle cx="10" cy="15" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  security: (
    <>
      <path d="M24 6l16 6v10c0 10-7 16-16 20-9-4-16-10-16-20V12l16-6z" />
      <path d="M17 24l5 5 9-10" />
    </>
  ),
  cloud: (
    <>
      <path d="M8 32a10 10 0 0 1 0-20 12 12 0 0 1 23.4-3A10 10 0 0 1 40 28" />
      <path d="M20 36v-10M28 36v-10M16 32l4-4 4 4M24 32l4-4 4 4" />
    </>
  ),
  webdev: (
    <>
      <rect x="4" y="6" width="40" height="32" rx="3" />
      <path d="M4 14h40" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M16 26l-6 3 6 3M32 26l6 3-6 3M22 34l4-12" />
      <path d="M14 42h20M24 38v4" />
    </>
  ),
  softdev: (
    <>
      <rect x="4" y="6" width="40" height="32" rx="3" />
      <path d="M4 14h40" />
      <rect x="10" y="20" width="10" height="10" rx="1" />
      <path d="M26 22h10M26 27h7" />
      <path d="M14 42h20M24 38v4" />
    </>
  ),
  consult: (
    <>
      <rect x="6" y="6" width="36" height="28" rx="3" />
      <path d="M6 18h36M18 34v8M30 34v8M14 42h20" />
      <path d="M16 12h4M26 12h6" />
    </>
  ),
  support: (
    <>
      <path d="M24 8a14 14 0 0 0-14 14v6a6 6 0 0 0 6 6h2v-12h-6M38 28a14 14 0 0 0-14-14" />
    </>
  ),
  data: (
    <>
      <rect x="10" y="28" width="6" height="12" />
      <rect x="21" y="20" width="6" height="20" />
      <rect x="32" y="12" width="6" height="28" />
      <path d="M10 20l11-8 8 4 11-8" />
    </>
  ),
};

const TICK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

/* Static fallback cards (converted from the original portfolio.html markup).
   Rendered until/unless the admin API returns published projects. */
const FALLBACK_PROJECTS = [
  {
    category: 'webdev',
    featured: true,
    client: 'Mac Data Hub',
    location: 'Greater Accra',
    title: 'Full Business Website & E-Commerce Store — Launched in 3 Weeks',
    description: (
      <>
        {
          'Mac Data Hub is a website for reselling Cheap Data Bundle. We designed and built a professional website with an integrated online store, product catalogue, and mobile payment checkout. The site went live in 21 days. Within the first month, they received 458 online orders from outside their local area — customers they would never have reached before. Visit the live website here '
        }
        <a href="https://macdatahubgh.com"> MaC Data Hub</a>
      </>
    ),
    outcomes: ['Live in 21 days', '14 new-region orders in month 1', 'Mobile-optimised + SEO-ready'],
    year: '2024',
    svg: (
      <>
        <rect x="4" y="6" width="40" height="32" rx="3" />
        <path d="M4 14h40" />
        <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="22" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <path d="M16 26l-6 3 6 3M32 26l6 3-6 3M22 34l4-12" />
        <path d="M14 42h20M24 38v4" />
      </>
    ),
  },
  {
    category: 'softdev',
    client: 'Duys Social App',
    location: 'Agona',
    title: 'Social Media Platform with powered by in-built Crypto token ($DUYS).',
    description:
      'The app was developed to help creators especially local creators to share their contents and earn through the engagements they earn from the app.',
    outcomes: ['Paper ledgers eliminated', 'Automated daily reports'],
    year: '2024',
    svg: (
      <>
        <rect x="6" y="4" width="36" height="40" rx="4" />
        <path d="M6 16h36" />
        <path d="M16 26l-6 4 6 4M32 26l6 4-6 4M22 36l4-16" />
        <circle cx="14" cy="10" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="20" cy="10" r="1.5" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    category: 'softdev',
    client: 'Church of Pentecost District App',
    location: 'Agona',
    title: 'Church Website with Event Calendar & Sermon Archive',
    description:
      'Designed and built a clean, mobile-first app for a local congregation — featuring an events calendar, downloadable sermon audio, an online giving page, and a simple CMS so the church admin can update content without any technical help.',
    outcomes: ['Self-managed CMS', 'Online giving integrated'],
    year: '2023',
    svg: (
      <>
        <rect x="4" y="6" width="40" height="32" rx="3" />
        <path d="M4 14h40" />
        <rect x="10" y="20" width="10" height="10" rx="1" />
        <path d="M26 22h10M26 27h7" />
        <path d="M14 42h20M24 38v4" />
      </>
    ),
  },
  {
    category: 'softdev',
    client: 'Yeboah Clinic',
    location: 'Tarkwa',
    title: 'Patient Appointment & Records Web App',
    description:
      'Built a secure, browser-based appointment booking system with a patient records module — replacing a paper-based system that caused double-bookings and lost files. Staff can search, book, and update records from any device; patients receive SMS reminders automatically.',
    outcomes: ['Zero double-bookings', 'SMS reminders automated'],
    year: '2025',
    svg: (
      <>
        <rect x="8" y="4" width="32" height="40" rx="3" />
        <path d="M16 14h16M16 20h10M16 26h12M16 32h8" />
        <circle cx="36" cy="36" r="8" />
        <path d="M33 36l2 2 4-4" />
      </>
    ),
  },
  {
    category: 'security',
    client: 'Sarpong & Co.',
    location: 'Takoradi',
    title: 'Security Audit & Endpoint Hardening for a Legal Firm',
    description:
      'Conducted a full vulnerability assessment, found 14 critical gaps including unpatched endpoints and weak remote-access policies. Delivered a remediation roadmap and implemented endpoint protection, MFA, and staff phishing awareness training within six weeks.',
    outcomes: ['14 vulnerabilities closed', 'MFA deployed org-wide'],
    year: '2024',
    svg: (
      <>
        <path d="M24 4L6 12v12c0 11 8 20 18 22 10-2 18-11 18-22V12L24 4z" />
        <polyline points="17 24 22 29 31 19" />
      </>
    ),
  },
  {
    category: 'cloud',
    client: 'Mensah Logistics',
    location: 'Tarkwa',
    title: 'On-Premise to Cloud Migration — Cut IT Costs by 40 %',
    description:
      'Mensah Logistics was running ageing on-site servers with no offsite backup. We migrated their file shares, accounting system, and email to a cloud-hosted stack, implemented automated daily backups, and handed over a self-service admin dashboard their office manager can use without IT knowledge.',
    outcomes: ['40 % monthly cost saving', 'Automated daily backups'],
    year: '2023',
    svg: (
      <>
        <path d="M8 32a10 10 0 0 1 0-20 12 12 0 0 1 23.4-3A10 10 0 0 1 40 28" />
        <path d="M20 36v-10M28 36v-10M16 32l4-4 4 4M24 32l4-4 4 4" />
      </>
    ),
  },
  {
    category: 'consult',
    client: 'Boateng Medical Centre',
    location: 'Agona',
    title: 'IT Strategy Roadmap for a Growing Medical Practice',
    description:
      "The clinic's IT was a patchwork of consumer-grade equipment and ad-hoc solutions. We audited the environment, interviewed staff, and delivered a clear 18-month IT roadmap prioritised by risk and return — including a phased move to a healthcare-appropriate cloud stack.",
    outcomes: ['18-month roadmap delivered', '3 quick wins identified'],
    year: '2024',
    svg: (
      <>
        <rect x="6" y="6" width="36" height="28" rx="3" />
        <path d="M6 18h36M18 34v8M30 34v8M14 42h20" />
        <path d="M16 12h4M26 12h6" />
      </>
    ),
  },
  {
    category: 'support',
    client: 'Asante Trading Co.',
    location: 'Agona',
    title: '24 / 7 Managed Support — Friday-Night Outage Resolved by Morning',
    description:
      'Asante Trading experienced a critical network failure on a Friday evening during a stock-taking exercise. Our on-call team responded within 20 minutes, diagnosed a failed core switch remotely, and had a replacement unit configured and operational before the next business day opened.',
    outcomes: ['< 20 min response time', 'Back online by 6 am'],
    year: '2024',
    svg: (
      <>
        <circle cx="24" cy="24" r="20" />
        <path d="M24 14v10l6 6" />
        <circle cx="24" cy="24" r="3" fill="currentColor" stroke="none" opacity=".3" />
      </>
    ),
  },
  {
    category: 'data',
    client: 'Antwi Group',
    location: 'Western Region',
    title: 'Data Cleanup, Centralisation & Automated Reporting Dashboard',
    description:
      'Years of unstructured files spread across personal drives and USB sticks were costing the finance team hours each week. We audited, cleaned, and centralised all data, set up role-based access controls, built automated weekly backup jobs, and delivered a simple reporting dashboard in Google Looker Studio.',
    outcomes: ['6 hrs/week saved', 'Automated backups live'],
    year: '2022',
    svg: (
      <>
        <ellipse cx="24" cy="12" rx="16" ry="5" />
        <path d="M40 24c0 2.76-7.16 5-16 5S8 26.76 8 24" />
        <path d="M40 12v24c0 2.76-7.16 5-16 5S8 38.76 8 36V12" />
      </>
    ),
  },
  {
    category: 'network',
    client: 'Agyenim School',
    location: 'Agona',
    title: 'School-Wide Wi-Fi Deployment Across 8 Classrooms',
    description:
      'Designed and installed a managed wireless network covering all teaching areas, the admin block, and the computer lab. Configured content filtering and a student/staff SSID separation so teachers maintain full bandwidth priority during school hours.',
    outcomes: ['8 rooms covered', 'Content filtering active'],
    year: '2022',
    svg: (
      <>
        <rect x="4" y="8" width="40" height="28" rx="3" />
        <path d="M16 40h16M24 36v4M12 20h24M12 26h16" />
      </>
    ),
  },
  {
    category: 'cloud',
    client: 'Fortis Pharmacy',
    location: 'Tarkwa',
    title: 'Secure Cloud Email & Document Management Setup',
    description:
      'Migrated the pharmacy off a self-hosted, unpatched mail server onto Microsoft 365, configured email security policies, spam filtering, and set up SharePoint for document collaboration — enabling hybrid working for management staff.',
    outcomes: ['M365 deployed in 5 days', 'Zero spam since launch'],
    year: '2023',
    svg: (
      <>
        <path d="M8 32a10 10 0 0 1 0-20 12 12 0 0 1 23.4-3A10 10 0 0 1 40 28" />
        <rect x="16" y="30" width="16" height="12" rx="2" />
        <path d="M20 30v-4a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
];

const FILTERS = [
  ['all', 'All Projects'],
  ['network', 'Network'],
  ['security', 'Cybersecurity'],
  ['cloud', 'Cloud'],
  ['webdev', 'Web Dev'],
  ['softdev', 'Software Dev'],
  ['consult', 'Consulting'],
  ['support', 'IT Support'],
  ['data', 'Data'],
];

function ProjectCard({ p, injected = false }) {
  const outcomes = Array.isArray(p.outcomes) ? p.outcomes : [];

  const inner = (
    <>
      <div className="pf-visual">
        {p.image ? (
          <img className="pf-img" src={p.image} alt={p.title} loading="lazy" />
        ) : (
          <svg
            className="pf-illustration"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {p.svg || CAT_SVGS[p.category] || CAT_SVGS.consult}
          </svg>
        )}
        <span className={`pf-tag tag-${p.category}`}>{CAT_LABELS[p.category] || 'Project'}</span>
      </div>
      <div className="pf-body">
        <p className="pf-client">
          {p.client}
          {p.location ? ` · ${p.location}` : ''}
        </p>
        <h3>{p.title}</h3>
        <p>{p.description}</p>
        {outcomes.length > 0 && (
          <div className="pf-outcomes">
            {outcomes.map((o, i) => (
              <span className="pf-outcome" key={i}>
                {TICK} {o}
              </span>
            ))}
          </div>
        )}
        <div className="pf-card-foot">
          <span className="pf-year">{p.year || ''}</span>
          <Link href="/contact" className="pf-more">
            Similar project? {ARROW}
          </Link>
        </div>
      </div>
    </>
  );

  if (injected) {
    /* Admin-managed card (ported from renderProject in site-content.js) */
    return (
      <div className={`pf-card${p.featured ? ' pf-featured' : ''} reveal visible`} data-cat={p.category}>
        {inner}
      </div>
    );
  }
  return (
    <Reveal as="div" className={`pf-card${p.featured ? ' pf-featured' : ''}`} data-cat={p.category}>
      {inner}
    </Reveal>
  );
}

export default function PortfolioGrid() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(null); // null = keep static fallback

  useEffect(() => {
    let alive = true;
    fetch('/api/content/projects', { headers: { Accept: 'application/json' } })
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
  const all = items || FALLBACK_PROJECTS;
  const visible = all.filter((p) => filter === 'all' || p.category === filter);

  return (
    <>
      {/* filter buttons */}
      <Reveal as="div" className="pf-filters" id="pfFilters">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? 'pf-filter active' : 'pf-filter'}
            data-filter={value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </Reveal>

      {/* project cards */}
      <div className="pf-grid" id="pfGrid">
        {visible.map((p, i) => (
          <ProjectCard key={i} p={p} injected={injected} />
        ))}

        {/* no-results message */}
        <div
          className="pf-no-results"
          id="pfNoResults"
          style={{
            display: visible.length === 0 ? 'block' : 'none',
            gridColumn: '1/-1',
            textAlign: 'center',
            padding: '60px 0',
            color: 'var(--muted)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 40, height: 40, margin: '0 auto 14px', display: 'block', opacity: 0.4 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ fontSize: '.95rem' }}>No projects found for that filter.</p>
        </div>
      </div>
    </>
  );
}
