'use client';

import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotionPreference(onChange) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener('change', onChange);
  return () => mediaQuery.removeEventListener('change', onChange);
}

function getMotionPreference() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerMotionPreference() {
  return true;
}

export default function AcademyHeroMedia({ src, poster, alt }) {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    getServerMotionPreference
  );

  if (reducedMotion) {
    return <img className="academy-hero-video" src={poster} alt={alt} fetchPriority="high" />;
  }

  return (
    <video
      className="academy-hero-video"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-hidden="true"
      tabIndex="-1"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
