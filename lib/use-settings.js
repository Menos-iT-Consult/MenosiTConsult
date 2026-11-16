'use client';

import { useEffect, useState } from 'react';

/**
 * Fetches GET /api/content/settings once per page load (shared promise) and
 * returns it. Returns null while loading / when the API is unreachable, so
 * callers can fall back to their built-in static content — same graceful
 * degradation as the old site-content.js.
 */
let settingsPromise = null;

function fetchSettingsOnce() {
  if (!settingsPromise) {
    settingsPromise = fetch('/api/content/settings', {
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return settingsPromise;
}

export function useSettings() {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchSettingsOnce().then((data) => {
      if (alive && data && typeof data === 'object') setSettings(data);
    });
    return () => {
      alive = false;
    };
  }, []);
  return settings;
}
