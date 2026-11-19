'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

export default function StudentIdCardPage() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [photoError, setPhotoError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProfile() {
      setLoading(true);
      setError('');
      setVerificationUrl('');
      setVerificationError('');
      setPhotoError(false);
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

        try {
          const verificationResponse = await fetch('/api/academy/student/id-verification', {
            credentials: 'include',
            cache: 'no-store',
            signal: controller.signal,
          });
          const verification = await verificationResponse.json();
          if (verificationResponse.status === 401) {
            window.location.assign('/academy/login');
            return;
          }
          if (!verificationResponse.ok) {
            throw new Error(verification.error || 'Could not load the ID verification code.');
          }
          setVerificationUrl(new URL(verification.path, window.location.origin).toString());
        } catch (verificationLoadError) {
          if (verificationLoadError.name !== 'AbortError') {
            setVerificationError(verificationLoadError.message || 'Could not load the ID verification code.');
          }
        }
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
  const fullAddress = [student.address, student.city, student.region].filter(Boolean).join(', ');
  return (
    <main className="ap-main">
      <header className="ap-page-head ap-id-card-heading">
        <div>
          <h1>Student ID card</h1>
          <p>Show or print your ID. Scan the QR code to verify it against Academy records.</p>
        </div>
        <button className="ap-button ap-button-primary no-print" type="button" onClick={() => window.print()}>
          Print / Save as PDF
        </button>
      </header>
      <section className="ap-id-card" aria-label="Student identification card">
        <svg className="ap-id-card-decoration" viewBox="0 0 856 540" preserveAspectRatio="none" aria-hidden="true">
          <path fill="#29263f" d="M0 0h856v129c-114-31-187-91-319-94C350 32 182 117 0 60V0Z" />
          <path fill="#b68b27" d="M0 0h856v96c-120-34-194-76-322-78C351 16 180 104 0 43V0Z" />
          <path fill="#d4b14e" d="M0 0h856v62c-125-30-198-59-322-61C351 0 177 85 0 30V0Z" />
          <path fill="#29263f" d="M0 430c145 35 237 88 372 84 167-5 297-105 484-76v102H0V430Z" />
          <path fill="#b68b27" d="M0 461c149 39 239 70 372 65 164-6 304-91 484-61v75H0v-79Z" />
          <path fill="#d4b14e" d="M0 490c151 34 245 54 372 49 164-7 315-76 484-47v48H0v-50Z" />
        </svg>
        <header className="ap-id-card-brand">
          <img className="ap-id-card-logo" src="/assets/academy-logo-white.png" alt="MITA IT Academy" />
          <h2>STUDENT ID CARD</h2>
        </header>
        <div className="ap-id-card-body">
          {student.photo && !photoError ? (
            <img
              className="ap-id-card-photo"
              src={student.photo}
              alt={`${fullName} passport photo`}
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div
              className="ap-id-card-photo ap-id-card-placeholder"
              role="img"
              aria-label={photoError ? 'Student passport photo unavailable' : 'No passport photo provided'}
            >
              <span>{fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>
              <small>{photoError ? 'Photo unavailable' : 'No photo'}</small>
            </div>
          )}
          <div className="ap-id-card-details">
            <dl>
              <div><dt>Name</dt><dd>{fullName || 'Not provided'}</dd></div>
              <div><dt>ID</dt><dd>{student.studentId || 'Not assigned'}</dd></div>
              <div><dt>D.O.B</dt><dd>{displayDate(student.dob)}</dd></div>
              <div><dt>Address</dt><dd>{fullAddress || 'Not provided'}</dd></div>
            </dl>
          </div>
          <aside className="ap-id-card-qr">
            {verificationUrl ? (
              <a href={verificationUrl} target="_blank" rel="noopener noreferrer" aria-label="Open student ID verification">
                <QRCodeSVG value={verificationUrl} size={112} level="M" marginSize={4} title="Scan to verify student ID" />
              </a>
            ) : (
              <span className="ap-id-card-qr-empty">QR unavailable</span>
            )}
            <small>SCAN TO VERIFY</small>
          </aside>
        </div>
        <footer className="ap-id-card-footer">OFFICIAL STUDENT IDENTIFICATION · MENOS I.T. CONSULT</footer>
      </section>
      {verificationError && <p className="ap-error ap-id-card-verification-error" role="alert">{verificationError}</p>}
    </main>
  );
}
