'use client';

import { useEffect } from 'react';

/**
 * Global page effects ported from script.js that are not tied to a specific
 * React component: card tilt on hover, hero-card float animation and smooth
 * scrolling for same-page anchor links. Mount once in the root layout.
 */
export default function SiteEffects() {
  useEffect(() => {
    // ── Smooth anchor scroll (same-page links only) ──
    const onAnchorClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    };
    document.addEventListener('click', onAnchorClick);

    // ── Service/preview/value card hover tilt ──
    const cards = document.querySelectorAll(
      '.service-card, .preview-card, .value-card'
    );
    const cleanups = [];
    cards.forEach((card) => {
      const move = (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        card.style.transform = `translateY(-5px) rotateX(${(-y / r.height) * 4}deg) rotateY(${(x / r.width) * 4}deg)`;
        card.style.transition = 'transform .08s';
      };
      const leave = () => {
        card.style.transform = '';
        card.style.transition =
          'transform .55s cubic-bezier(.16,1,.3,1), box-shadow .35s, border-color .3s';
      };
      card.addEventListener('mousemove', move);
      card.addEventListener('mouseleave', leave);
      cleanups.push(() => {
        card.removeEventListener('mousemove', move);
        card.removeEventListener('mouseleave', leave);
      });
    });

    // ── Hero cards float animation ──
    if (!document.querySelector('#heroFloatKf')) {
      const style = document.createElement('style');
      style.id = 'heroFloatKf';
      style.textContent = `
        @keyframes cardFloat {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }`;
      document.head.appendChild(style);
    }
    document.querySelectorAll('.hero-card').forEach((card, i) => {
      card.style.animation = `cardFloat ${2.8 + i * 0.35}s ease-in-out ${i * 0.3}s infinite`;
    });

    return () => {
      document.removeEventListener('click', onAnchorClick);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
