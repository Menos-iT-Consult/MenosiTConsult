'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

function display(value) {
  return value == null || value === '' ? 'Not provided' : value;
}

function displayDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

function consentLabel(value) {
  if (value == null) return 'Not recorded';
  return value ? 'Accepted' : 'Not accepted';
}

function Detail({ label, children }) {
  return <div className="ap-def"><dt>{label}</dt><dd>{children}</dd></div>;
}

export default function AcademyStudentDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [details, setDetails] = useState(null);
  const [scholarshipId, setScholarshipId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/academy/admin/students/${encodeURIComponent(id)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load student details.');
      setDetails(result);
      setScholarshipId(result.scholarship?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'Could not load student details.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function saveScholarship(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/academy/admin/students/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scholarshipId: scholarshipId || null }),
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not update the scholarship award.');
      setDetails(result);
      setScholarshipId(result.scholarship?.id || '');
      setNotice('Scholarship award updated.');
    } catch (saveError) {
      setError(saveError.message || 'Could not update the scholarship award.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="ap-main"><p>Loading student details…</p></main>;
  if (error && !details) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" type="button" onClick={load}>Try again</button>
      </main>
    );
  }
  if (!details) return null;

  const student = details.student;
  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const scholarships = [...(details.availableScholarships || [])];
  if (details.scholarship && !scholarships.some((item) => item.id === details.scholarship.id)) {
    scholarships.unshift(details.scholarship);
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <Link className="ap-link" href="/academy/admin/students">← Student directory</Link>
          <h1>{fullName || 'Student details'}</h1>
          <p>{student.studentId || 'No Student ID'} · {student.status}</p>
        </div>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}

      {student.photo && (
        <section className="ap-card ap-section">
          <h2>Passport photo</h2>
          <img className="ap-admin-student-photo" src={student.photo} alt={`${fullName} passport photo`} />
        </section>
      )}

      <section className="ap-card ap-section">
        <h2>Personal details</h2>
        <dl className="ap-defs">
          <Detail label="First name">{display(student.firstName)}</Detail>
          <Detail label="Middle name">{display(student.middleName)}</Detail>
          <Detail label="Last name">{display(student.lastName)}</Detail>
          <Detail label="Date of birth">{display(student.dob)}</Detail>
          <Detail label="Country">{display(student.nationality)}</Detail>
          <Detail label="Gender">{display(student.gender)}</Detail>
          <Detail label="Email">
            {student.email ? <a href={`mailto:${student.email}`}>{student.email}</a> : 'Not provided'}
          </Detail>
          <Detail label="Phone">{display(student.phone)}</Detail>
        </dl>
      </section>

      <section className="ap-card ap-section">
        <h2>Contact details</h2>
        <dl className="ap-defs">
          <Detail label="Residential address">{display(student.address)}</Detail>
          <Detail label="City or town">{display(student.city)}</Detail>
          <Detail label="Region or state">{display(student.region)}</Detail>
          <Detail label="Emergency contact name">{display(student.guardianName)}</Detail>
          <Detail label="Relationship">{display(student.guardianRelationship)}</Detail>
          <Detail label="Emergency contact phone">{display(student.guardianPhone)}</Detail>
        </dl>
      </section>

      <section className="ap-card ap-section">
        <h2>Academic background</h2>
        <dl className="ap-defs">
          <Detail label="Highest qualification">{display(student.highestQualification)}</Detail>
          <Detail label="School, college, or institution">{display(student.institution)}</Detail>
          <Detail label="Field of study">{display(student.fieldOfStudy)}</Detail>
          <Detail label="Year completed">{display(student.graduationYear)}</Detail>
          <Detail label="Program">{display(details.program?.name)}</Detail>
        </dl>
        <h3>Study statement</h3>
        <p className="ap-student-statement">{display(student.studyReason)}</p>
      </section>

      <section className="ap-card ap-section">
        <h2>Tuition and scholarship</h2>
        <dl className="ap-defs">
          <Detail label="Fee per semester">
            {details.program?.feePerSemester == null
              ? 'Not configured'
              : `GHS ${details.program.feePerSemester.toFixed(2)}`}
          </Detail>
          <Detail label="Scholarship">
            {details.scholarship
              ? `${details.scholarship.name} · ${details.scholarship.discountType === 'percentage'
                ? `${details.scholarship.discountValue}%`
                : `GHS ${details.scholarship.discountValue.toFixed(2)} per semester`}`
              : 'No scholarship assigned'}
          </Detail>
          <Detail label="Semester amount due">
            {details.semesterFee ? `GHS ${details.semesterFee.amountDue.toFixed(2)}` : 'Not available'}
          </Detail>
        </dl>
        <form className="ap-form-grid ap-scholarship-assignment" onSubmit={saveScholarship}>
          <label>Assign scholarship
            <select className="ap-select" value={scholarshipId} onChange={(event) => setScholarshipId(event.target.value)}>
              <option value="">No scholarship</option>
              {scholarships.map((scholarship) => (
                <option key={scholarship.id} value={scholarship.id}>
                  {scholarship.name}{scholarship.active ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
          </label>
          <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save scholarship'}
          </button>
        </form>
      </section>

      <section className="ap-card ap-section">
        <h2>Submission and consent</h2>
        <dl className="ap-defs">
          <Detail label="Submitted">{displayDate(student.createdAt)}</Detail>
          <Detail label="Admitted">{displayDate(student.admittedAt)}</Detail>
          <Detail label="Accuracy confirmation">{consentLabel(student.confirmAccuracy)}</Detail>
          <Detail label="Terms accepted">{consentLabel(student.termsAccepted)}</Detail>
          <Detail label="Privacy policy accepted">{consentLabel(student.privacyConsent)}</Detail>
        </dl>
      </section>
    </main>
  );
}
