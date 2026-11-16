'use client';

import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/lib/use-settings';

/**
 * Count-up number animation on scroll into view (same easing/timing as the
 * vanilla countUp in script.js). Renders the target value server-side for
 * SEO/no-JS, then animates 0 → to on first view.
 */
export function CountUp({ to = 0, className = '', ...rest }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const duration = 1600;
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * to));
            if (progress < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        });
      },
      { threshold: 0.7 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [to]);

  // Start at 0 once we know we can animate (avoids SSR/CSR text mismatch: both
  // render `to` on the server and first client render).
  const shown = ref.current ? display : to;
  return (
    <span ref={ref} className={className} {...rest}>
      {shown}
    </span>
  );
}

/**
 * Stats counter driven by Admin → Settings (stats.*) with a static fallback.
 * Renders the original markup: <strong class="count" data-stat data-to>.
 */
export default function Stat({ statKey, fallback = 0, className = 'count' }) {
  const settings = useSettings();
  const to = Number(settings?.stats?.[statKey] ?? fallback);
  return (
    <CountUp to={to} className={className} data-stat={statKey} data-to={to} />
  );
}
