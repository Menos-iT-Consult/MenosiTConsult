'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

async function readJson(response, fallback) {
  let result;
  try { result = await response.json(); } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error(fallback);
  }
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

export default function useInstructorDashboard() {
  const router = useRouter();
  const requestRef = useRef(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError('');

    try {
      const sessionResponse = await fetch('/api/academy/staff/auth/me', {
        credentials: 'include',
        signal: controller.signal,
      });
      const session = await readJson(sessionResponse, 'Could not verify your instructor session.');
      if (!session.loggedIn || !session.staff) {
        router.replace('/instructor/login');
        return;
      }
      if (session.staff.role !== 'instructor') {
        router.replace('/academy/admin/announcements');
        return;
      }

      const endpoints = [
        '/api/academy/instructor/courses',
        '/api/academy/instructor/assignments',
        '/api/academy/instructor/submissions',
        '/api/academy/instructor/progress',
      ];
      const responses = await Promise.all(endpoints.map((endpoint) => fetch(endpoint, {
        credentials: 'include',
        signal: controller.signal,
      })));
      const results = await Promise.all(responses.map((response) =>
        readJson(response, 'Could not load your instructor workspace.')
      ));

      setDashboard({
        staff: session.staff,
        courses: results[0],
        assignments: results[1],
        submissions: results[2],
        progress: results[3],
      });
    } catch (loadError) {
      if (loadError.name !== 'AbortError') {
        setError(loadError.message || 'Could not load your instructor workspace.');
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    load();
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [load]);

  return { dashboard, loading, error, reload: load };
}
