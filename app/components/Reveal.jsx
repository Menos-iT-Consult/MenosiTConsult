'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal wrapper. Observes the element and adds `.visible` when it
 * enters the viewport, with a staggered delay based on sibling position —
 * same behaviour as the vanilla IntersectionObserver in script.js.
 */
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const siblings = Array.from(
            e.target.parentElement?.querySelectorAll('.reveal') || []
          );
          const idx = siblings.indexOf(e.target);
          e.target.style.transitionDelay = Math.min(idx * 0.07, 0.42) + 's';
          e.target.classList.add('visible');
          io.unobserve(e.target);
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`reveal ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
