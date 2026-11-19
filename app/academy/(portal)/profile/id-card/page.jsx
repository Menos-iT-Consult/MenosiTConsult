'use client';

import { useEffect, useState } from 'react';

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export default function StudentIdCardPage() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/academy/student/me', {
          credentials: 'include',
          signal: controller.signal,
        });
        const result = await response.json();
        if (response.status === 401) {
          window.location.assign('/academy/login');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'Could not load your student ID card.');
        setStudent(result);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load your student ID card.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProfile();
    return () => controller.abort();
  }, [reloadKey]);

  if (loading) return <main className="ap-main"><p>Loading your student ID card…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" type="button" onClick={() => setReloadKey((key) => key + 1)}>
          Try again
        </button>
      </main>
    );
  }

  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  return (
    <main className="ap-main">
      <header className="ap-page-head ap-id-card-heading">
        <div>
          <h1>Student ID card</h1>
          <p>Show your academy identification or print a copy.</p>
        </div>
        <button className="ap-button ap-button-primary no-print" type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </header>
      <section className="ap-id-card" aria-label="Student identification card">
        <header className="ap-id-card-brand">
          <span className="ap-id-card-mark" aria-hidden="true">M</span>
          <div><strong>MITA Academy</strong><small>Student identification</small></div>
        </header>
        <div className="ap-id-card-body">
          {student.photo ? (
            <img className="ap-id-card-photo" src={student.photo} alt={`${fullName} profile`} />
          ) : (
            <div className="ap-id-card-photo ap-id-card-placeholder" aria-hidden="true">
              {fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
            </div>
          )}
          <div className="ap-id-card-details">
            <h2>{fullName || 'Student'}</h2>
            <dl>
              <div><dt>Student ID</dt><dd>{student.studentId || 'Not assigned'}</dd></div>
              <div><dt>Program</dt><dd>{student.program?.name || 'Not assigned'}</dd></div>
              <div><dt>Admission date</dt><dd>{displayDate(student.admittedAt)}</dd></div>
            </dl>
          </div>
        </div>
        <footer className="ap-id-card-footer">Menos iT Consult · Information Technology Academy</footer>
      </section>
    </main>
  );
}
