'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    if (!window.confirm(`Approve ${fullName(student)} and send the admission details by SMS?`)) return;
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
      setNotice(`${fullName(student)} was admitted and the SMS was sent.`);
    } catch (saveError) {
      setError(saveError.message || 'Could not approve this admission.');
    } finally {
      setSaving('');
    }
  }

  async function retryAdmissionSms(student) {
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
      if (!response.ok) throw new Error(result.error || 'Could not retry the admission SMS.');
      setNotice(`Admission SMS sent to ${student.phone}.`);
    } catch (retryError) {
      setError(retryError.message || 'Could not retry the admission SMS.');
    } finally {
      setSaving('');
    }
  }

  async function signOut() {
    setError('');
    try {
      const response = await fetch('/api/academy/staff/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      router.replace('/academy/admin/login');
    } catch (signOutError) {
      setError(signOutError.message || 'Could not sign out.');
    }
  }

  return (
    <div className="ap">
      <main className="ap-main">
        <header className="ap-page-head ap-admin-heading">
          <div>
            <h1>Admission applications</h1>
            <p>Review applications and approve students. Approval activates portal access and sends the Student ID by SMS.</p>
          </div>
          <div className="ap-actions">
            <Link className="ap-button" href="/academy/admin/instructors">Instructor accounts</Link>
            <Link className="ap-button" href="/academy/admin/announcements">Announcements</Link>
            <button className="ap-button" onClick={signOut}>Sign out</button>
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

                  <button
                    className="ap-button ap-button-primary"
                    type="button"
                    onClick={() => approveAdmission(student)}
                    disabled={saving === student.id}
                  >
                    {saving === student.id ? 'Approving…' : 'Approve admission and send SMS'}
                  </button>
                </article>
              ))}
            </div>
          ) : !error ? (
            <div className="ap-card ap-empty"><p>No pending applications.</p></div>
          ) : null}
        </section>

        <section className="ap-section">
          <h2>Admission SMS failures</h2>
          <p className="ap-muted">These students are already admitted. Retrying sends the existing Student ID and temporary password again.</p>
          {smsFailures.length ? (
            <div className="ap-stack">
              {smsFailures.map((student) => (
                <article className="ap-card" key={student.id}>
                  <div className="ap-card-heading">
                    <div>
                      <h3>{fullName(student)}</h3>
                      <p className="ap-muted">{student.studentId} · {student.phone}</p>
                    </div>
                    <span className="ap-chip ap-chip-pending">SMS failed</span>
                  </div>
                  <p>{student.smsError || 'mNotify did not confirm delivery.'}</p>
                  <p className="ap-muted">Last attempt: {displayDate(student.smsFailedAt)}</p>
                  <button
                    className="ap-button"
                    type="button"
                    onClick={() => retryAdmissionSms(student)}
                    disabled={saving === student.id}
                  >
                    {saving === student.id ? 'Retrying…' : 'Retry SMS'}
                  </button>
                </article>
              ))}
            </div>
          ) : !loading ? (
            <div className="ap-card ap-empty"><p>No failed admission SMS messages.</p></div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
