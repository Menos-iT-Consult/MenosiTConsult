'use client';

import { useEffect, useState } from 'react';

export default function useStudentPortalData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPortal() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/academy/student/portal', {
          credentials: 'include',
          signal: controller.signal,
        });
        const result = await response.json();
        if (response.status === 401) {
          window.location.assign('/academy/login');
          return;
        }
        if (!response.ok) {
          throw new Error(result.error || 'Could not load student portal data.');
        }
        setData(result);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load student portal data.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPortal();
    return () => controller.abort();
  }, [reloadKey]);

  return {
    data,
    loading,
    error,
    reload: () => setReloadKey((key) => key + 1),
  };
}
