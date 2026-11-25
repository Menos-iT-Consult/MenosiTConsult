'use client';

import { useEffect, useState } from 'react';
import academySettings from '@/lib/academy-site-settings';

const { DEFAULT_ACADEMY_SITE_SETTINGS, normalizeAcademySiteSettings } = academySettings;

export default function useAcademySiteSettings() {
  const [settings, setSettings] = useState(DEFAULT_ACADEMY_SITE_SETTINGS);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/academy/site-settings', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load Academy contact settings.');
        return result;
      })
      .then((result) => {
        setSettings(normalizeAcademySiteSettings(result.settings));
        setError('');
      })
      .catch((loadError) => {
        if (loadError.name === 'AbortError') return;
        console.error('Academy site settings load error:', loadError);
        setError('Contact details may be outdated. Please use the email shown below to reach the Academy.');
      });

    return () => controller.abort();
  }, []);

  return { settings, error };
}
