'use client';

import { useEffect, useState } from 'react';

export default function StudentCertificatePage() {
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function loadCertificate() {
      try {
        const response = await fetch('/api/academy/student/certificate', {
          credentials: 'include',
          signal: controller.signal,
        });
        const result = await response.json();
        if (response.status === 401) {
          window.location.assign('/academy/login');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'Could not load your certificate status.');
        setCertificate(result.certificate);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load your certificate status.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadCertificate();
    return () => controller.abort();
  }, []);

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Certificate</h1>
        <p>Your Academy-issued certificate will be available here.</p>
      </header>
      {loading ? <p>Checking certificate status…</p> : error ? (
        <div className="ap-error" role="alert">{error}</div>
      ) : certificate ? (
        <section className="ap-card ap-certificate-card">
          <span className="ap-chip ap-chip-active">Issued</span>
          <h2>Certificate available</h2>
          <p>Certificate number: <strong>{certificate.certificateNumber}</strong></p>
          <p>Program: {certificate.programName}</p>
          <p>Issue date: {certificate.issueDate}</p>
          <a className="ap-button ap-button-primary" href="/api/academy/student/certificate/download">
            Download certificate
          </a>
        </section>
      ) : (
        <section className="ap-card ap-certificate-locked" aria-live="polite">
          <span className="ap-lock-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </span>
          <h2>Certificate locked</h2>
          <p>Your certificate has not been issued yet. Contact the Academy administrator if you have questions.</p>
        </section>
      )}
    </main>
  );
}
