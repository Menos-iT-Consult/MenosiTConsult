'use client';

import Link from 'next/link';
import useStudentPortalData from '../useStudentPortalData';

export default function ProfilePage() {
  const { data, loading, error, reload } = useStudentPortalData();

  if (loading) return <main className="ap-main"><p>Loading your profile…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const student = data.student;
  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>My profile</h1>
        <p>Your student account information.</p>
      </header>

      {student.mustChangePassword && (
        <div className="ap-notice">
          <h2>Change your default password</h2>
          <p>For your account’s safety, update the password issued by the academy.</p>
          <Link href="/academy/change-password" className="ap-link">Change password</Link>
        </div>
      )}

      <section className="ap-card">
        <h2>Student details</h2>
        <dl className="ap-profile-grid">
          <div><dt>Name</dt><dd>{student.firstName} {student.lastName}</dd></div>
          <div><dt>Student ID</dt><dd>{student.studentId || 'Not assigned'}</dd></div>
          <div><dt>Email</dt><dd>{student.email || 'Not provided'}</dd></div>
          <div><dt>Program ID</dt><dd>{student.programId || 'Not assigned'}</dd></div>
          <div>
            <dt>Account status</dt>
            <dd><span className="ap-chip ap-chip-active">Active</span></dd>
          </div>
          <div>
            <dt>Password setup</dt>
            <dd>
              <span className={`ap-chip ${student.mustChangePassword ? 'ap-chip-pending' : 'ap-chip-active'}`}>
                {student.mustChangePassword ? 'Change required' : 'Up to date'}
              </span>
            </dd>
          </div>
        </dl>
      </section>

      {data.academicFees && (
        <section className="ap-card ap-section">
          <h2>Academic fees</h2>
          <p className="ap-card-sub">Tuition per semester for {student.programName || 'your program'}.</p>
          <dl className="ap-defs">
            <div><dt>Tuition</dt><dd>{data.academicFees.currency} {data.academicFees.fee.toFixed(2)}</dd></div>
            <div><dt>Scholarship</dt><dd>{data.academicFees.scholarshipName || 'None assigned'}</dd></div>
            <div><dt>Scholarship discount</dt><dd>{data.academicFees.currency} {data.academicFees.scholarshipDiscount.toFixed(2)}</dd></div>
            <div><dt>Amount due per semester</dt><dd><strong>{data.academicFees.currency} {data.academicFees.amountDue.toFixed(2)}</strong></dd></div>
          </dl>
          <Link className="ap-link" href="/academy/fees">View fee and invoice details</Link>
        </section>
      )}

      <section className="ap-section">
        <div className="ap-card-heading">
          <h2>My enrolled courses</h2>
          <Link href="/academy/courses">View all</Link>
        </div>
        {(data.enrollments || []).length ? (
          <div className="ap-grid-2">
            {data.enrollments.map((enrollment) => (
              <article className="ap-card" key={enrollment.enrollment_id}>
                <h3>{enrollment.course_title || 'Course'}</h3>
                <p className="ap-card-sub">{enrollment.session_name || 'Academy session'}</p>
                <Link
                  href={`/academy/courses/${encodeURIComponent(enrollment.course_id)}`}
                  className="ap-link"
                >
                  View course
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>No courses are linked to your account yet.</p></div>
        )}
      </section>
    </main>
  );
}
