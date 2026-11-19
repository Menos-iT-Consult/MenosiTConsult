'use client';

import { useEffect, useMemo, useState } from 'react';
import useStudentPortalData from '../useStudentPortalData';

const STATUSES = ['present', 'late', 'absent', 'excused'];

function formatDate(value) {
  if (!value) return 'Unknown';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AttendancePage() {
  const { data, loading: portalLoading, error: portalError } = useStudentPortalData();
  const [courseId, setCourseId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);
    if (sessionId) params.set('session_id', sessionId);

    async function loadAttendance() {
      setLoading(true);
      setError('');
      try {
        const query = params.toString();
        const response = await fetch(
          `/api/academy/student/attendance${query ? `?${query}` : ''}`,
          { credentials: 'include', signal: controller.signal }
        );
        const result = await response.json();
        if (response.status === 401) {
          window.location.assign('/academy/login');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'Could not load attendance history.');
        setAttendance(result.attendance || []);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setError(loadError.message || 'Could not load attendance history.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadAttendance();
    return () => controller.abort();
  }, [courseId, sessionId]);

  const courses = useMemo(() => {
    const unique = new Map();
    for (const enrollment of data?.enrollments || []) {
      if (!unique.has(enrollment.course_id)) {
        unique.set(enrollment.course_id, enrollment.course_title || 'Course');
      }
    }
    return Array.from(unique, ([id, title]) => ({ id, title }));
  }, [data]);

  const sessions = useMemo(() => {
    const unique = new Map();
    for (const enrollment of data?.enrollments || []) {
      if (!unique.has(enrollment.session_id)) {
        unique.set(enrollment.session_id, enrollment.session_name || 'Academic session');
      }
    }
    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [data]);

  const totals = attendance.reduce((counts, record) => {
    counts[record.status] = (counts[record.status] || 0) + 1;
    return counts;
  }, {});

  if (portalLoading) return <main className="ap-main"><p>Loading your attendance…</p></main>;
  if (portalError) return <main className="ap-main"><div className="ap-error" role="alert">{portalError}</div></main>;

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Attendance history</h1>
        <p>Review attendance recorded for your enrolled courses.</p>
      </header>

      <section className="ap-card ap-section">
        <div className="ap-form-grid">
          <label>
            Course
            <select className="ap-select" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">All courses</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label>
            Session
            <select className="ap-select" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
              <option value="">All sessions</option>
              {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      {error && <div className="ap-error" role="alert">{error}</div>}

      <section className="ap-stat-grid" aria-label="Attendance totals">
        {STATUSES.map((status) => (
          <article className="ap-stat" key={status}>
            <span>{status[0].toUpperCase() + status.slice(1)}</span>
            <strong>{totals[status] || 0}</strong>
          </article>
        ))}
      </section>

      <section className="ap-section">
        <h2>Attendance records</h2>
        {loading ? <p>Loading attendance records…</p> : attendance.length ? (
          <div className="ap-stack">
            {attendance.map((record) => (
              <article className="ap-card ap-list-row" key={record.id}>
                <div>
                  <strong>{record.courseTitle}</strong>
                  <p className="ap-muted">{record.courseCode ? `${record.courseCode} · ` : ''}{record.sessionName}</p>
                  {record.note && <p>{record.note}</p>}
                </div>
                <div>
                  <time>{formatDate(record.meetingDate)}</time>
                  <span className="ap-chip ap-chip-neutral">{record.status}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="ap-card ap-empty">
            <p>No attendance records match these filters.</p>
          </div>
        )}
      </section>
    </main>
  );
}
