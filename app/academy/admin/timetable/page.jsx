'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EMPTY_FORM = {
  sessionId: '',
  courseId: '',
  dayOfWeek: '',
  startTime: '',
  endTime: '',
  venue: '',
};

async function readResult(response) {
  const result = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    const error = new Error(result.error || 'Your administrator session has expired.');
    error.authRequired = true;
    throw error;
  }
  if (!response.ok) throw new Error(result.error || 'Could not complete the timetable request.');
  return result;
}

function notificationSummary(notifications) {
  if (!notifications) return '';
  if (!notifications.recipients) return ' No active students are enrolled in this course for the selected session.';
  const failed = notifications.emailFailed + notifications.smsFailed;
  const result = ` Notified ${notifications.recipients} student(s): ${notifications.emailSent} email(s) and ${notifications.smsSent} SMS message(s) sent.`;
  return failed ? `${result} ${failed} delivery channel(s) failed.` : result;
}

export default function AcademyTimetableAdminPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const responses = await Promise.all([
        fetch('/api/academy/admin/sessions', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/academy/admin/courses', { credentials: 'include', cache: 'no-store' }),
        fetch('/api/academy/timetable', { credentials: 'include', cache: 'no-store' }),
      ]);
      const [sessionResult, courseResult, timetableResult] = await Promise.all(responses.map(readResult));
      setSessions(sessionResult);
      setCourses(courseResult.courses || []);
      setEntries(timetableResult);
      setForm((current) => current.sessionId
        ? current
        : { ...current, sessionId: sessionResult.find((session) => session.is_current)?.id || '' });
    } catch (loadError) {
      if (loadError.authRequired) {
        router.replace('/admin');
        return;
      }
      setError(loadError.message || 'Could not load timetable information.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function editEntry(entry) {
    setEditingId(entry.id);
    setForm({
      sessionId: entry.session_id || '',
      courseId: entry.course_id || '',
      dayOfWeek: entry.day_of_week || '',
      startTime: entry.start_time || '',
      endTime: entry.end_time || '',
      venue: entry.venue || '',
    });
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId('');
    setForm({
      ...EMPTY_FORM,
      sessionId: sessions.find((session) => session.is_current)?.id || '',
    });
    setError('');
  }

  async function saveEntry(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/timetable', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...form, ...(editingId ? { id: editingId } : {}) }),
      });
      const result = await readResult(response);
      setNotice(`${editingId ? 'Timetable entry updated.' : 'Class scheduled.'}${notificationSummary(result.notifications)}`);
      resetForm();
      await load();
    } catch (saveError) {
      if (saveError.authRequired) {
        router.replace('/admin');
        return;
      }
      setError(saveError.message || 'Could not save this timetable entry.');
    } finally {
      setSaving(false);
    }
  }

  async function cancelEntry(entry) {
    if (!window.confirm(`Cancel ${entry.course_title || 'this class'} on ${entry.day_of_week} at ${entry.start_time}? Students will be notified.`)) {
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/academy/timetable?id=${encodeURIComponent(entry.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await readResult(response);
      setNotice(`Class schedule cancelled.${notificationSummary(result.notifications)}`);
      if (editingId === entry.id) resetForm();
      await load();
    } catch (cancelError) {
      if (cancelError.authRequired) {
        router.replace('/admin');
        return;
      }
      setError(cancelError.message || 'Could not cancel this timetable entry.');
    } finally {
      setSaving(false);
    }
  }

  function sessionName(id) {
    return sessions.find((session) => session.id === id)?.name || 'Unknown session';
  }

  function courseName(id) {
    const course = courses.find((item) => item.id === id);
    return course ? `${course.code ? `${course.code} · ` : ''}${course.title}` : 'Unknown course';
  }

  return (
    <main className="ap-main">
      <header className="ap-page-head ap-admin-heading">
        <div>
          <h1>Class timetable</h1>
          <p>Schedule classes for an academic session and notify enrolled students.</p>
        </div>
      </header>

      {error && <div className="ap-error" role="alert">{error}</div>}
      {notice && <div className="ap-success" role="status">{notice}</div>}

      <section className="ap-card ap-section">
        <h2>{editingId ? 'Edit class schedule' : 'Schedule a class'}</h2>
        {!sessions.length || !courses.length ? (
          <p className="ap-muted">
            Add at least one academic session and course before scheduling classes.{' '}
            <Link href="/academy/admin/instructors">Manage sessions and courses</Link>.
          </p>
        ) : (
          <form className="ap-form-grid" onSubmit={saveEntry}>
            <label>Academic session
              <select className="ap-select" name="sessionId" value={form.sessionId} onChange={updateField} required>
                <option value="">Choose a session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}{session.is_current ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>Course
              <select className="ap-select" name="courseId" value={form.courseId} onChange={updateField} required>
                <option value="">Choose a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code ? `${course.code} · ` : ''}{course.title}
                  </option>
                ))}
              </select>
            </label>
            <label>Day
              <select className="ap-select" name="dayOfWeek" value={form.dayOfWeek} onChange={updateField} required>
                <option value="">Choose a day</option>
                {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </label>
            <label>Start time
              <input className="ap-input" type="time" name="startTime" value={form.startTime} onChange={updateField} required />
            </label>
            <label>End time
              <input className="ap-input" type="time" name="endTime" value={form.endTime} onChange={updateField} required />
            </label>
            <label>Venue <span className="ap-muted">(optional)</span>
              <input className="ap-input" name="venue" maxLength={200} value={form.venue} onChange={updateField} placeholder="Room, campus, or online" />
            </label>
            <div className="ap-form-wide ap-timetable-form-actions">
              <button className="ap-button ap-button-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Schedule class'}
              </button>
              {editingId && (
                <button className="ap-button" type="button" onClick={resetForm} disabled={saving}>
                  Stop editing
                </button>
              )}
            </div>
          </form>
        )}
      </section>

      <section className="ap-section">
        <h2>Scheduled classes</h2>
        {loading ? <p role="status">Loading timetable…</p> : entries.length ? (
          <div className="ap-stack">
            {entries.map((entry) => (
              <article className="ap-card ap-timetable-admin-entry" key={entry.id}>
                <div>
                  <h3>{courseName(entry.course_id)}</h3>
                  <p className="ap-muted">
                    {sessionName(entry.session_id)} · {entry.day_of_week} · {entry.start_time}–{entry.end_time}
                    {entry.venue ? ` · ${entry.venue}` : ''}
                  </p>
                </div>
                <div className="ap-timetable-admin-actions">
                  <button className="ap-button" type="button" onClick={() => editEntry(entry)} disabled={saving}>
                    Edit
                  </button>
                  <button className="ap-button ap-button-danger" type="button" onClick={() => cancelEntry(entry)} disabled={saving}>
                    Cancel class
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : !error ? (
          <div className="ap-card ap-empty"><p>No classes are scheduled yet.</p></div>
        ) : null}
      </section>
    </main>
  );
}
