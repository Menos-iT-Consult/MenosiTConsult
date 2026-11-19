'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function fullName(student) {
  return [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
}

function displayDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
}

export default function AcademyAdmissionsAdminPage() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [smsFailures, setSmsFailures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/academy/admin/students', { credentials: 'include' });
      const result = await response.json();
      if (response.status === 401) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load admission applications.');
      setApplications(result.applications || []);
      setSmsFailures(result.smsFailures || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load admission applications.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  async function approveAdmission(student) {
    if (!window.confirm(`Approve ${fullName(student)} and send the admission details by email and SMS?`)) return;
    setSaving(student.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `/api/academy/admin/students/${encodeURIComponent(student.id)}/admit`,
        { method: 'POST', credentials: 'include' }
      );
      const result = await response.json();
      await loadApplications();
      if (!response.ok) throw new Error(result.error || 'Could not approve this admission.');
      setNotice(`${fullName(student)} was admitted and email and SMS notifications were sent.`);
    } catch (saveError) {
      setError(saveError.message || 'Could not approve this admission.');
    } finally {
      setSaving('');
    }
  }

  async function retryAdmissionNotifications(student) {
    setSaving(student.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `/api/academy/admin/students/${encodeURIComponent(student.id)}/admission-sms`,
        { method: 'POST', credentials: 'include' }
      );
      const result = await response.json();
      await loadApplications();
      if (!response.ok) throw new Error(result.error || 'Could not retry the admission notifications.');
      setNotice(`Admission email and SMS notifications were sent to ${fullName(student)}.`);
    } catch (retryError) {
      setError(retryError.message || 'Could not retry the admission notifications.');
    } finally {
      setSaving('');
    }
  }

  async function declineAdmission(student) {
    if (!window.confirm(`Decline ${fullName(student)}'s admission application and notify them by email and SMS?`)) return;
    setSaving(student.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `/api/academy/admin/students/${encodeURIComponent(student.id)}/reject`,
        { method: 'POST', credentials: 'include' }
      );
      const result = await response.json();
      await loadApplications();
      if (!response.ok) throw new Error(result.error || 'Could not decline this application.');
      const delivered = result.notifications?.email.sent && result.notifications?.sms.sent;
      setNotice(delivered
        ? `${fullName(student)}'s application was declined and email and SMS notifications were sent.`
        : `${fullName(student)}'s application was declined, but one or more notifications could not be sent.`);
    } catch (saveError) {
      setError(saveError.message || 'Could not decline this application.');
    } finally {
      setSaving('');
    }
  }

  return (
    <main className="ap-main">
        <header className="ap-page-head ap-admin-heading">
          <div>
            <h1>Admission applications</h1>
            <p>Review applications and approve students. Approval activates portal access and sends the Student ID by email and SMS.</p>
          </div>
        </header>

        {error && <div className="ap-error" role="alert">{error}</div>}
        {notice && <div className="ap-success" role="status">{notice}</div>}

        <section className="ap-section">
          <h2>Pending applications</h2>
          <p className="ap-muted">The temporary password is the issued Student ID. Students must change it at first sign-in.</p>
          {loading ? <p>Loading applications…</p> : applications.length ? (
            <div className="ap-stack">
              {applications.map((student) => (
                <article className="ap-card" key={student.id}>
                  <div className="ap-card-heading">
                    <div>
                      <h3>{fullName(student)}</h3>
                      <p className="ap-muted">{student.programName} · Submitted {displayDate(student.createdAt)}</p>
                    </div>
                    <span className="ap-chip ap-chip-pending">Pending</span>
                  </div>

                  <dl className="ap-defs">
                    <div className="ap-def"><dt>Email</dt><dd><a href={`mailto:${student.email}`}>{student.email}</a></dd></div>
                    <div className="ap-def"><dt>Phone</dt><dd>{student.phone || 'Not provided'}</dd></div>
                    <div className="ap-def"><dt>Country</dt><dd>{student.nationality || 'Not provided'}</dd></div>
                    <div className="ap-def"><dt>Gender</dt><dd>{student.gender || 'Not provided'}</dd></div>
                    <div className="ap-def"><dt>Education</dt><dd>{student.highestQualification || 'Not provided'}</dd></div>
                    <div className="ap-def"><dt>Institution</dt><dd>{student.institution || 'Not provided'}</dd></div>
                  </dl>

                  <details>
                    <summary>View application details</summary>
                    <p>
                      <Link className="ap-link" href={`/academy/admin/students/${encodeURIComponent(student.id)}`}>
                        Open full student record
                      </Link>
                    </p>
                    <dl className="ap-defs">
                      <div className="ap-def"><dt>Date of birth</dt><dd>{student.dob || 'Not provided'}</dd></div>
                      <div className="ap-def"><dt>Field of study</dt><dd>{student.fieldOfStudy || 'Not provided'}</dd></div>
                      <div className="ap-def"><dt>Graduation year</dt><dd>{student.graduationYear || 'Not provided'}</dd></div>
                      <div className="ap-def"><dt>Address</dt><dd>{[student.address, student.city, student.region, student.country].filter(Boolean).join(', ') || 'Not provided'}</dd></div>
                      <div className="ap-def"><dt>Emergency contact</dt><dd>{[student.guardianName, student.guardianRelationship, student.guardianPhone].filter(Boolean).join(' · ') || 'Not provided'}</dd></div>
                    </dl>
                    <p className="ap-card-sub">Why they want to study</p>
                    <p>{student.studyReason || 'Not provided'}</p>
                  </details>

                  <div className="ap-form-grid">
                    <button
                      className="ap-button ap-button-primary"
                      type="button"
                      onClick={() => approveAdmission(student)}
                      disabled={saving === student.id}
                    >
                      {saving === student.id ? 'Approving…' : 'Approve admission and notify'}
                    </button>
                    <button
                      className="ap-button ap-button-danger"
                      type="button"
                      onClick={() => declineAdmission(student)}
                      disabled={saving === student.id}
                    >
                      Decline and notify
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : !error ? (
            <div className="ap-card ap-empty"><p>No pending applications.</p></div>
          ) : null}
        </section>

        <section className="ap-section">
          <h2>Admission notification failures</h2>
          <p className="ap-muted">These students are already admitted. Retrying sends the existing Student ID and temporary password by email and SMS.</p>
          {smsFailures.length ? (
            <div className="ap-stack">
              {smsFailures.map((student) => (
                <article className="ap-card" key={student.id}>
                  <div className="ap-card-heading">
                    <div>
                      <h3>{fullName(student)}</h3>
                      <p className="ap-muted">{student.studentId} · {student.failedChannels}</p>
                    </div>
                    <span className="ap-chip ap-chip-pending">Delivery failed</span>
                  </div>
                  <p>{student.notificationError || 'One or more channels did not confirm delivery.'}</p>
                  <p className="ap-muted">Last attempt: {displayDate(student.notificationFailedAt)}</p>
                  <button
                    className="ap-button"
                    type="button"
                    onClick={() => retryAdmissionNotifications(student)}
                    disabled={saving === student.id}
                  >
                    {saving === student.id ? 'Retrying…' : 'Retry email and SMS'}
                  </button>
                </article>
              ))}
            </div>
          ) : !loading ? (
            <div className="ap-card ap-empty"><p>No failed admission notifications.</p></div>
          ) : null}
        </section>
      </main>
  );
}
