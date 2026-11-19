'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function VerifyStudentIdPage() {
  const { token } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function verifyCard() {
      setResult(null);
      setError('');
      try {
        const response = await fetch(`/api/academy/student/verify/${encodeURIComponent(token)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not verify this student ID.');
        setResult(body);
      } catch (verifyError) {
        if (verifyError.name !== 'AbortError') {
          setError(verifyError.message || 'Could not verify this student ID.');
        }
      }
    }
    if (token) verifyCard();
    return () => controller.abort();
  }, [token]);

  return (
    <main className="ap-id-verification">
      <section className="ap-id-verification-card" aria-live="polite">
        <div className="ap-id-verification-mark" aria-hidden="true">M</div>
        <p className="ap-id-verification-eyebrow">MITA IT Academy</p>
        {error ? (
          <>
            <h1>Verification unavailable</h1>
            <p role="alert">{error}</p>
          </>
        ) : !result ? (
          <>
            <h1>Verifying student ID</h1>
            <p>Please wait while we check the Academy records.</p>
          </>
        ) : result.valid ? (
          <>
            <h1 className="is-verified">Student ID verified</h1>
            <p>This ID is valid and belongs to an active MITA Academy student.</p>
            <dl>
              <div><dt>Name</dt><dd>{result.student.name}</dd></div>
              <div><dt>Student ID</dt><dd>{result.student.studentId}</dd></div>
            </dl>
          </>
        ) : (
          <>
            <h1 className="is-unverified">Student ID not verified</h1>
            <p>This code is invalid or the student ID is no longer active.</p>
          </>
        )}
        <Link href="/academy" className="ap-link">MITA IT Academy</Link>
      </section>
    </main>
  );
}
