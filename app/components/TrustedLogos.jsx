'use client';

import { useSettings } from '@/lib/use-settings';

const FALLBACK_LOGOS = [
  'KAB Enterprises',
  'Sarpong & Co.',
  'Mensah Logistics',
  'Asante Trading Co.',
  'Boateng Medical Centre',
  'Mac Data Hub',
  'Fortis Pharmacy',
  'Agyenim School',
  'Antwi Group',
  'Yeboah Clinic',
];

/**
 * Trusted-company marquee (homepage). Logos are managed in Admin → Settings →
 * Trusted Companies; falls back to the built-in static list. Items are
 * rendered twice for the seamless -50% translate loop (replaces the old
 * `track.innerHTML += track.innerHTML` duplication in script.js).
 */
export default function TrustedLogos() {
  const settings = useSettings();
  const logos =
    Array.isArray(settings?.trustedLogos) && settings.trustedLogos.length > 0
      ? settings.trustedLogos
      : FALLBACK_LOGOS;

  const items = logos.map((l, i) => (
    <div className="marquee-item marquee-logo" key={i}>
      {l?.image ? <img src={l.image} alt={l.name || ''} loading="lazy" /> : l?.name || l}
    </div>
  ));

  return (
    <div className="marquee-track" id="marqueeTrack" aria-hidden="true">
      {items}
      {items.map((it, i) => (
        <div className="marquee-item marquee-logo" key={`dup-${i}`} aria-hidden="true">
          {logos[i]?.image ? (
            <img src={logos[i].image} alt={logos[i].name || ''} loading="lazy" />
          ) : (
            logos[i]?.name || logos[i]
          )}
        </div>
      ))}
    </div>
  );
}
