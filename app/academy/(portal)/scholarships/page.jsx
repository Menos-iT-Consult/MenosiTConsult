'use client';

import { useCallback, useEffect, useState } from 'react';

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function discountLabel(scholarship) {
  return scholarship.discountType === 'percentage'
    ? `${scholarship.discountValue}% tuition discount`
    : `GHS ${Number(scholarship.discountValue).toFixed(2)} discount per semester`;
}

function applicationStatusClass(status) {
  if (status === 'approved') return 'ap-chip-active';
  if (status === 'rejected') return 'ap-chip-pending';
  return 'ap-chip-neutral';
}

export default function StudentScholarshipsPage() {
  const [data, setData] = useState(null);
  const [scholarshipId, setScholarshipId] = useState('');
  const [statement, setStatement] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/academy/student/scholarship-applications', {
        credentials: 'include',
        cache: 'no-store',
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.assign('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load scholarship information.');
      setData(result);
    } catch (loadError) {
      setError(loadError.message || 'Could not load scholarship information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitApplication(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/student/scholarship-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scholarshipId, statement }),
      });
      const result = await response.json();
      if (response.status === 401) {
        window.location.assign('/academy/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not submit your application.');
      setNotice('Your scholarship application was submitted for administrator review.');
      setStatement('');
      await load();
    } catch (submitError) {
      setError(submitError.message || 'Could not submit your application.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <main className="ap-main"><p>Loading scholarship programs…</p></main>;
  if (error && !data) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" type="button" onClick={load}>Try again</button>
      </main>
    );
  }

  const scholarships = data?.scholarships || [];
  const application = data?.application;
  const awardedScholarship = data?.awardedScholarship;
  const canApply = !awardedScholarship && application?.status !== 'pending' && scholarships.length > 0;

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Scholarship applications</h1>
        <p>Review scholarships available for your program and submit an application for administrator review.</p>
      </header>

      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}

      {awardedScholarship && (
        <section className="ap-card ap-section">
          <h2>Scholarship awarded</h2>
          <p><strong>{awardedScholarship.name}</strong> · {discountLabel(awardedScholarship)}</p>
          <p className="ap-muted">The Academy has already assigned a scholarship to your student account.</p>
        </section>
      )}

      {application && (
        <section className="ap-card ap-section">
          <div className="ap-card-heading">
            <h2>Your latest application</h2>
            <span className={`ap-chip ${applicationStatusClass(application.status)}`}>
              {application.status}
            </span>
          </div>
          <p><strong>{application.scholarshipName}</strong> · Submitted {formatDate(application.createdAt)}</p>
          <p className="ap-student-statement">{application.statement}</p>
          {application.reviewNote && (
            <p className="ap-notice"><strong>Administrator feedback:</strong> {application.reviewNote}</p>
          )}
          {application.status === 'pending' && (
            <p className="ap-muted">Your application is being reviewed. You can apply again if it is declined.</p>
          )}
        </section>
      )}

      <section className="ap-section">
        <h2>Available scholarships</h2>
        {scholarships.length ? (
          <div className="ap-stack">
            {scholarships.map((scholarship) => (
              <article className="ap-card" key={scholarship.id}>
                <h3>{scholarship.name}</h3>
                <p className="ap-muted">{discountLabel(scholarship)}</p>
                {scholarship.description && <p>{scholarship.description}</p>}
              </article>
            ))}
          </div>
        ) : (
          <div className="ap-card ap-empty">
            <p>No active scholarship programs are currently available for your program.</p>
          </div>
        )}
      </section>

      {canApply && (
        <section className="ap-card ap-section">
          <h2>Apply for a scholarship</h2>
          <p className="ap-muted">Tell the Academy why you are applying. Your statement will be reviewed by an administrator.</p>
          <form className="ap-form-grid" onSubmit={submitApplication}>
            <label>
              Scholarship program
              <select
                className="ap-select"
                value={scholarshipId}
                onChange={(event) => setScholarshipId(event.target.value)}
                required
              >
                <option value="">Choose a scholarship</option>
                {scholarships.map((scholarship) => (
                  <option key={scholarship.id} value={scholarship.id}>
                    {scholarship.name} · {discountLabel(scholarship)}
                  </option>
                ))}
              </select>
            </label>
            <label className="ap-form-wide">
              Application statement
              <textarea
                className="ap-input ap-textarea"
                rows={5}
                minLength={20}
                maxLength={2000}
                value={statement}
                onChange={(event) => setStatement(event.target.value)}
                placeholder="Explain why you are applying for this scholarship."
                required
              />
              <small>Enter 20–2,000 characters.</small>
            </label>
            <button className="ap-button ap-button-primary" type="submit" disabled={saving || !scholarshipId}>
              {saving ? 'Submitting…' : 'Submit application'}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
