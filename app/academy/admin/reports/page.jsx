'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function amount(value) {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function fullName(student) {
  return [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ');
}

export default function AcademyReportsPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState('');
  const [report, setReport] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (sessionId) params.set('session_id', sessionId);
      const response = await fetch(`/api/academy/admin/reports?${params}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load Academy reports.');
      setReport(result);
      setSessions(result.sessions || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load Academy reports.');
    } finally {
      setLoading(false);
    }
  }, [router, sessionId]);

  useEffect(() => { load(); }, [load]);

  const summary = report?.summary || {};
  const exportUrl = (dataset) => {
    const params = new URLSearchParams({ format: 'csv', dataset });
    if (sessionId) params.set('session_id', sessionId);
    return `/api/academy/admin/reports?${params}`;
  };

  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Academy reports</h1>
          <p>Review enrollment, academic performance, attendance, and fee collection.</p>
        </div>
        <label className="ap-filter-field">Academic session
          <select className="ap-select" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
            <option value="">All sessions</option>
            {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
          </select>
        </label>
      </header>
      {error && <div className="ap-error" role="alert">{error}</div>}
      {loading ? <p>Loading reports…</p> : report ? (
        <>
          <section className="ap-stat-grid" aria-label="Academy summary">
            <article className="ap-stat"><span>Active students</span><strong>{summary.active_students}</strong></article>
            <article className="ap-stat"><span>Enrolled students</span><strong>{summary.enrolled_students}</strong></article>
            <article className="ap-stat"><span>Active courses</span><strong>{summary.active_courses}</strong></article>
            <article className="ap-stat"><span>Average grade</span><strong>{summary.average_grade || '—'}</strong></article>
            <article className="ap-stat"><span>Attendance records</span><strong>{summary.attendance_records}</strong><small>{summary.present_records} present</small></article>
            <article className="ap-stat"><span>Paid fees</span><strong>{amount(summary.paid_fees)}</strong></article>
            <article className="ap-stat"><span>Outstanding fees</span><strong>{amount(summary.outstanding_fees)}</strong></article>
            <article className="ap-stat"><span>Scholarships awarded</span><strong>{summary.awarded_scholarships}</strong></article>
            <article className="ap-stat">
              <span>Pending payments</span>
              <strong>{summary.pending_payments}</strong>
              <a href="/academy/admin/payments">Review payments</a>
            </article>
            <article className="ap-stat">
              <span>Open support requests</span>
              <strong>{summary.open_support_tickets}</strong>
              <a href="/academy/admin/support">View support</a>
            </article>
          </section>

          <section className="ap-section">
            <div className="ap-section-heading">
              <h2>Course performance</h2>
              <a className="ap-button" href={exportUrl('courses')}>Export courses CSV</a>
            </div>
            <div className="ap-table-wrap ap-card">
              <table className="ap-table">
                <thead>
                  <tr><th>Course</th><th>Enrolled</th><th>Average grade</th><th>Attendance</th><th>Present</th></tr>
                </thead>
                <tbody>
                  {report.courses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.code ? `${course.code} · ` : ''}{course.title}</td>
                      <td>{course.enrollment_count}</td>
                      <td>{course.average_grade ?? '—'}</td>
                      <td>{course.attendance_count}</td>
                      <td>{course.present_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ap-section">
            <div className="ap-section-heading">
              <h2>Student summary</h2>
              <a className="ap-button" href={exportUrl('students')}>Export students CSV</a>
            </div>
            <div className="ap-table-wrap ap-card">
              <table className="ap-table">
                <thead>
                  <tr><th>Student</th><th>Program</th><th>Courses</th><th>Average grade</th><th>Attendance</th><th>Outstanding</th></tr>
                </thead>
                <tbody>
                  {report.students.map((student) => (
                    <tr key={student.id}>
                      <td>{fullName(student)}<br /><small>{student.student_id}</small></td>
                      <td>{student.program_name || '—'}</td>
                      <td>{student.course_count}</td>
                      <td>{student.average_grade ?? '—'}</td>
                      <td>{student.present_count}/{student.attendance_count}</td>
                      <td>{amount(student.outstanding_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
