'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ProgramCards() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPrograms() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/academy/programs', {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error('Programs are temporarily unavailable.');
        }
        if (!Array.isArray(result)) {
          throw new Error('The program list could not be loaded.');
        }
        setPrograms(result);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          console.error('Failed to load Academy programs:', loadError);
          setError('We could not load programs right now. Please try again or contact the academy.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPrograms();
    return () => controller.abort();
  }, [retry]);

  if (loading) {
    return <div className="academy-program-state" role="status">Loading available programs…</div>;
  }

  if (error) {
    return (
      <div className="academy-program-state academy-program-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => setRetry((value) => value + 1)}>
          Try again
        </button>
      </div>
    );
  }

  if (!programs.length) {
    return (
      <div className="academy-program-state">
        <p>There are no programs open for applications right now.</p>
        <a href="https://menositconsult.com/contact">Contact the academy</a>
      </div>
    );
  }

  return (
    <div className="academy-program-grid">
      {programs.map((program, index) => (
        <article className="academy-program-card" key={program.id}>
          <div className={`academy-program-icon academy-program-icon-${index % 3}`}>
            <span>{program.code || String(index + 1).padStart(2, '0')}</span>
          </div>
          <p className="academy-program-code">{program.code || 'MITA PROGRAM'}</p>
          <h3>{program.name}</h3>
          <p className="academy-program-description">
            {program.description || 'Explore practical skills and build your knowledge in this field.'}
          </p>
          <div className="academy-program-footer">
            <span>{program.durationSemesters} semesters</span>
            <Link href="/academy/register" aria-label={`Apply for ${program.name}`}>
              Apply <span aria-hidden="true">→</span>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
