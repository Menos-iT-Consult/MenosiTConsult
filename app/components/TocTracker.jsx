'use client';

import { useEffect } from 'react';

/**
 * TOC active-link tracking — verbatim port of public/assets/js/legal.js.
 * Observes the sections targeted by `.legal-toc ol a` links and toggles
 * `.toc-active` on the link whose section is in view, plus smooth-scroll
 * (−88px offset) for TOC clicks. Renders nothing; relies on the page's TOC
 * markup being present in the DOM.
 */
export default function TocTracker() {
  useEffect(() => {
    const tocLinks = Array.from(document.querySelectorAll('.legal-toc ol a'));
    const sections = tocLinks.map((a) => document.querySelector(a.getAttribute('href')));

    if (!tocLinks.length) return;

    const setActive = (idx) => {
      tocLinks.forEach((a, i) => a.classList.toggle('toc-active', i === idx));
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sections.indexOf(entry.target);
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { rootMargin: '-10% 0px -75% 0px', threshold: 0 }
    );

    sections.forEach((s) => s && io.observe(s));

    /* smooth scroll for TOC clicks */
    const listeners = [];
    tocLinks.forEach((a) => {
      const handler = (e) => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top, behavior: 'smooth' });
      };
      a.addEventListener('click', handler);
      listeners.push([a, handler]);
    });

    return () => {
      io.disconnect();
      listeners.forEach(([a, handler]) => a.removeEventListener('click', handler));
    };
  }, []);

  return null;
}
