'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Reveal from '@/app/components/Reveal';
import NewsletterForm from '@/app/components/NewsletterForm';
import {
  API,
  categoryMeta,
  postUrl,
  fmtDate,
} from '@/lib/blog-format';

const CLOCK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
);
const CAL = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
);
const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);
const SHIELD = (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4L6 12v12c0 11 8 20 18 22 10-2 18-11 18-22V12L24 4z" /><path d="M17 24l5 5 9-9" /></svg>
);

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'security', label: 'Cybersecurity' },
  { key: 'cloud', label: 'Cloud' },
  { key: 'network', label: 'Network' },
  { key: 'webdev', label: 'Web Dev' },
  { key: 'software', label: 'Software' },
  { key: 'business', label: 'Business IT' },
  { key: 'tips', label: 'Quick Tips' },
];

/* Static demo cards — the original hard-coded markup in blog.html. They are
   shown until the API responds (or for good when the API is unreachable). */
const FALLBACK_POSTS = [
  {
    cat: 'cloud', cls: 'cat-cloud', label: 'Cloud', time: '5 min', date: 'May 2025',
    title: 'Is Your Business Ready to Move to the Cloud? A 5-Point Checklist',
    excerpt: "Cloud migration isn't right for every business at every moment. Use this checklist to work out whether now is the right time — and what to sort out first.",
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 32a10 10 0 0 1 0-20 12 12 0 0 1 23.4-3A10 10 0 0 1 40 28" /><path d="M20 36v-10M28 36v-10M16 32l4-4 4 4M24 32l4-4 4 4" /></svg>,
  },
  {
    cat: 'network', cls: '', label: 'Network', time: '4 min', date: 'April 2025',
    title: 'Why Your Office Wi-Fi Is Slow — And the Simple Fixes That Actually Work',
    excerpt: 'Slow Wi-Fi kills productivity. Before you blame your internet provider, check these common culprits — most can be fixed without spending a cedis.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="40" height="28" rx="3" /><path d="M16 40h16M24 36v4" /><path d="M4 28h40" /></svg>,
  },
  {
    cat: 'business', cls: 'cat-business', label: 'Business IT', time: '6 min', date: 'April 2025',
    title: 'How Much Should a Small Business Spend on IT? A Practical Guide',
    excerpt: "There's no single right answer — but there is a framework. We walk through how to think about IT spending at different stages of business growth.",
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="36" height="28" rx="3" /><path d="M6 18h36M18 34v8M30 34v8M14 42h20" /></svg>,
  },
  {
    cat: 'webdev', cls: 'cat-webdev', label: 'Web Dev', time: '5 min', date: 'March 2025',
    title: "Does Your Business Actually Need a Website in 2025? (Yes — Here's Why)",
    excerpt: "WhatsApp and Facebook pages are useful, but they don't replace a proper website. We explain what you're missing and what a simple site can realistically do for your business.",
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="40" height="32" rx="3" /><path d="M4 14h40" /><path d="M16 26l-6 3 6 3M32 26l6 3-6 3M22 34l4-12" /></svg>,
  },
  {
    cat: 'tips', cls: 'cat-tips', label: 'Quick Tips', time: '3 min', date: 'March 2025',
    title: '10 Free Tools Every Small Business Should Be Using Right Now',
    excerpt: "You don't need to spend a fortune on software. These free tools cover collaboration, file storage, password management, and more — and they're trusted by businesses worldwide.",
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="20" r="12" /><path d="M20 32v4a4 4 0 0 0 8 0v-4" /><path d="M18 20a6 6 0 0 1 12 0" /></svg>,
  },
  {
    cat: 'software', cls: 'cat-software', label: 'Software', time: '6 min', date: 'February 2025',
    title: 'When to Build Custom Software vs. Buy Off-the-Shelf',
    excerpt: "Custom software sounds expensive — and sometimes it is. But off-the-shelf tools have hidden costs too. Here's how to decide which path makes sense for your business.",
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="36" height="40" rx="4" /><path d="M6 16h36" /><path d="M16 26l-6 4 6 4M32 26l6 4-6 4M22 36l4-16" /></svg>,
  },
  {
    cat: 'security', cls: 'cat-security', label: 'Cybersecurity', time: '4 min', date: 'January 2025',
    title: 'Why "Use a Strong Password" Is Not Enough Anymore — And What to Do Instead',
    excerpt: "Passwords alone can't protect your accounts. Multi-factor authentication is the single biggest step most businesses haven't taken yet. Here's how to set it up in under an hour.",
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="14" y="20" width="20" height="18" rx="2" /><path d="M10 20v-6a14 14 0 0 1 28 0v6" /><circle cx="24" cy="30" r="2" fill="currentColor" stroke="none" /></svg>,
  },
  {
    cat: 'business', cls: 'cat-business', label: 'Business IT', time: '5 min', date: 'December 2024',
    title: 'Backup or Bust: Why Most Small Businesses Have No Real Recovery Plan',
    excerpt: "Losing your business data isn't a matter of if — it's when. Hard drives fail, ransomware strikes, employees delete the wrong file. Here's how to build a backup system that actually works.",
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="24" cy="12" rx="16" ry="5" /><path d="M40 24c0 2.76-7.16 5-16 5S8 26.76 8 24" /><path d="M40 12v24c0 2.76-7.16 5-16 5S8 38.76 8 36V12" /></svg>,
  },
  {
    cat: 'tips', cls: 'cat-tips', label: 'Quick Tips', time: '2 min', date: 'November 2024',
    title: 'How to Speed Up a Slow Computer in 10 Minutes (No Technical Knowledge Needed)',
    excerpt: 'Before you buy a new PC, try these quick fixes. In most cases a slow computer just needs a clean-up — not a replacement.',
    icon: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4l4 8 9 1.3-6.5 6.4 1.5 9L24 24l-8 4.7 1.5-9L11 13.3 20 12z" /><path d="M8 36h32M12 42h24" /></svg>,
  },
];

/* Static featured card — shown when the API is unreachable or returns nothing. */
const FALLBACK_FEATURED = {
  cat: 'Cybersecurity',
  title: '5 Cybersecurity Mistakes Small Businesses in Ghana Make — And How to Fix Them',
  excerpt: 'Most small business owners think hackers only go after big companies. The reality is very different — and the consequences of a breach for a small business can be devastating. We break down the five most common mistakes we see and exactly what to do about each one.',
  time: '7 min read',
  date: 'June 2025',
};

/* Static sidebar counts — replaced by live counts once posts load. */
const FALLBACK_SIDEBAR_CATS = [
  { key: 'security', label: 'Cybersecurity', count: 3 },
  { key: 'cloud', label: 'Cloud', count: 1 },
  { key: 'network', label: 'Network', count: 1 },
  { key: 'webdev', label: 'Web Dev', count: 1 },
  { key: 'software', label: 'Software', count: 1 },
  { key: 'business', label: 'Business IT', count: 2 },
  { key: 'tips', label: 'Quick Tips', count: 2 },
];

export default function BlogGrid() {
  const [posts, setPosts] = useState(null); // null = loading/fallback; array = live posts
  const [featured, setFeatured] = useState(null);
  const [loaded, setLoaded] = useState(false); // fetch finished (success or failure)
  const [filter, setFilter] = useState('all');
  const gridRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/blogs?status=published`);
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        if (cancelled) return;
        if (list.length === 0) return; // keep static fallback
        const top = list.find((p) => p.featured) || list[0];
        setPosts(list);
        setFeatured(top);
      } catch {
        // API unreachable — keep the static demo content as a fallback
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const usingFallback = posts === null;
  const cards = usingFallback ? FALLBACK_POSTS : posts;
  const visible = cards.filter((p) => {
    const cat = usingFallback ? p.cat : categoryMeta(p.category).key;
    return filter === 'all' || cat === filter;
  });

  const applyFilter = (cat) => setFilter(cat);

  const onSidebarCat = (e, cat) => {
    e.preventDefault();
    applyFilter(cat);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const meta = featured ? categoryMeta(featured.category) : null;

  return (
    <section className="section">
      <div className="container">

        {/* featured post */}
        {featured ? (
          <Link href={postUrl(featured.slug)} id="featuredPost" className="blog-featured">
            <div className="bf-visual">{SHIELD}</div>
            <div className="bf-body">
              <span className="bf-cat">{meta.label}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt || ''}</p>
              <div className="bf-meta">
                {featured.readTime ? <span>{CLOCK} {featured.readTime}</span> : null}
                <span>{CAL} {fmtDate(featured.createdAt)}</span>
                <span>By Menos iT Consult</span>
              </div>
              <span className="bf-read">Read article {ARROW}</span>
            </div>
          </Link>
        ) : usingFallback && loaded ? (
          <a href="#" id="featuredPost" className="blog-featured">
            <div className="bf-visual">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M24 4L6 12v12c0 11 8 20 18 22 10-2 18-11 18-22V12L24 4z" /><path d="M17 24l5 5 9-9" /></svg>
            </div>
            <div className="bf-body">
              <span className="bf-cat">{FALLBACK_FEATURED.cat}</span>
              <h2>{FALLBACK_FEATURED.title}</h2>
              <p>{FALLBACK_FEATURED.excerpt}</p>
              <div className="bf-meta">
                <span>{CLOCK} {FALLBACK_FEATURED.time}</span>
                <span>{CAL} {FALLBACK_FEATURED.date}</span>
                <span>By Menos iT Consult</span>
              </div>
              <span className="bf-read">Read article {ARROW}</span>
            </div>
          </a>
        ) : null}

        {/* main layout */}
        <div className="blog-layout">

          {/* article grid */}
          <div>
            {/* category filter */}
            <Reveal as="div" className="blog-filters" id="blogFilters">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`blog-filter${filter === f.key ? ' active' : ''}`}
                  data-filter={f.key}
                  onClick={() => applyFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </Reveal>

            <div className="blog-grid" id="blogGrid" ref={gridRef}>

              {usingFallback
                ? visible.map((p, i) => (
                    <Reveal as="a" href="#" className="blog-card" data-cat={p.cat} key={`${p.cat}-${i}`}>
                      <div className="bc-visual">
                        {p.icon}
                        <span className={`bc-cat ${p.cls}`}>{p.label}</span>
                      </div>
                      <div className="bc-body">
                        <div className="bc-meta">
                          <span>{CLOCK} {p.time}</span>
                          <span>{p.date}</span>
                        </div>
                        <h3>{p.title}</h3>
                        <p>{p.excerpt}</p>
                        <span className="bc-read">Read {ARROW}</span>
                      </div>
                    </Reveal>
                  ))
                : visible.map((p) => {
                    const m = categoryMeta(p.category);
                    return (
                      <Link href={postUrl(p.slug)} className="blog-card" data-cat={m.key} key={p.id || p.slug}>
                        <div className="bc-visual">
                          {SHIELD}
                          <span className={`bc-cat ${m.cls}`}>{m.label}</span>
                        </div>
                        <div className="bc-body">
                          <div className="bc-meta">
                            {p.readTime ? <span>{CLOCK} {p.readTime}</span> : null}
                            <span>{CAL} {fmtDate(p.createdAt)}</span>
                          </div>
                          <h3>{p.title || 'Untitled'}</h3>
                          <p>{p.excerpt || ''}</p>
                          <span className="bc-read">Read {ARROW}</span>
                        </div>
                      </Link>
                    );
                  })}

              {/* no-results */}
              <div
                className="blog-no-results"
                id="blogNoResults"
                style={{ display: visible.length === 0 ? 'block' : 'none' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <p style={{ fontSize: '.92rem' }}>No articles in that category yet — check back soon.</p>
              </div>

            </div>
          </div>

          {/* sidebar */}
          <aside className="blog-sidebar">
            <div className="sidebar-card">
              <h4>Get the newsletter</h4>
              <p>Practical IT tips delivered to your inbox — no spam, unsubscribe any time.</p>
              <NewsletterForm
                className="sidebar-nl nl-form"
                id="blogNlForm"
                buttonClassName="btn btn-primary btn-full"
                buttonLabel="Subscribe"
              />
            </div>
            <SidebarCats
              posts={posts}
              onSelect={onSidebarCat}
            />
            <div className="sidebar-card">
              <h4>Need help with your IT?</h4>
              <p>We work with businesses of all sizes across Ghana. Get in touch for a free initial chat.</p>
              <Link href="/contact" className="btn btn-primary btn-full">Talk to us</Link>
            </div>
          </aside>

        </div>
      </div>
    </section>
  );
}

function SidebarCats({ posts, onSelect }) {
  let cats;
  if (posts && posts.length > 0) {
    const counts = new Map();
    posts.forEach((p) => {
      const key = categoryMeta(p.category).key;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    if (counts.size === 0) return null;
    cats = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, n]) => ({ key, label: categoryMeta(key).label, count: n }));
  } else {
    cats = FALLBACK_SIDEBAR_CATS;
  }

  return (
    <div className="sidebar-card">
      <h4>Browse by topic</h4>
      <nav className="sidebar-cats">
        {cats.map((c) => (
          <a href="#" key={c.key} data-scat={c.key} onClick={(e) => onSelect(e, c.key)}>
            {c.label} <span>{c.count}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
