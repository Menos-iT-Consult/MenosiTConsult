'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AcademyInstructorAdminPage() {
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneDrafts, setPhoneDrafts] = useState({});
  const [courseForm, setCourseForm] = useState({
    title: '', code: '', programId: '', creditHours: '3', semesterNumber: '1', description: '',
  });
  const [sessionForm, setSessionForm] = useState({
    name: '', startDate: '', endDate: '', isCurrent: true,
  });
  const [selectedCourses, setSelectedCourses] = useState({});
  const [rosterCourseId, setRosterCourseId] = useState('');
  const [rosterSessionId, setRosterSessionId] = useState('');
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [staffResponse, coursesResponse] = await Promise.all([
        fetch('/api/academy/admin/staff', { credentials: 'include' }),
        fetch('/api/academy/admin/courses', { credentials: 'include' }),
      ]);
      const [staffResult, coursesResult] = await Promise.all([
        staffResponse.json(),
        coursesResponse.json(),
      ]);
      if (staffResponse.status === 401 || coursesResponse.status === 401) {
        router.replace('/academy/admin/login');
        return;
      }
      if (!staffResponse.ok) throw new Error(staffResult.error || 'Could not load staff accounts.');
      if (!coursesResponse.ok) throw new Error(coursesResult.error || 'Could not load courses.');
      setStaff(staffResult.filter((member) => member.role === 'instructor'));
      setPhoneDrafts(Object.fromEntries(
        staffResult.filter((member) => member.role === 'instructor')
          .map((member) => [member.id, member.phone || ''])
      ));
      setCourses(coursesResult.courses);
      setPrograms(coursesResult.programs);
      const sessionsResponse = await fetch('/api/academy/admin/sessions', { credentials: 'include' });
      const sessionsResult = await sessionsResponse.json();
      if (!sessionsResponse.ok) throw new Error(sessionsResult.error || 'Could not load Academy sessions.');
      setSessions(sessionsResult);
      setRosterCourseId((current) => current || coursesResult.courses[0]?.id || '');
      setRosterSessionId((current) => current || (
        sessionsResult.find((session) => session.is_current)?.id || sessionsResult[0]?.id || ''
      ));
      setSelectedCourses(Object.fromEntries(
        staffResult
          .filter((member) => member.role === 'instructor')
          .map((member) => [
            member.id,
            coursesResult.courses
              .filter((course) => course.instructorStaffId === member.id)
              .map((course) => course.id),
          ])
      ));
    } catch (loadError) {
      setError(loadError.message || 'Could not load instructor accounts.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!rosterCourseId || !rosterSessionId) {
      setRoster([]);
      setRosterLoading(false);
      setRosterError('');
      return undefined;
    }

    let active = true;
    async function loadRoster() {
      setRosterLoading(true);
      setRosterError('');
      setRoster([]);
      try {
        const response = await fetch(
          `/api/academy/admin/courses/${encodeURIComponent(rosterCourseId)}/students?sessionId=${encodeURIComponent(rosterSessionId)}`,
          { credentials: 'include', cache: 'no-store' }
        );
        const result = await response.json();
        if (response.status === 401 || response.status === 403) {
          router.replace('/academy/admin/login');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'Could not load enrolled students.');
        if (active) setRoster(result.students || []);
      } catch (loadError) {
        if (active) setRosterError(loadError.message || 'Could not load enrolled students.');
      } finally {
        if (active) setRosterLoading(false);
      }
    }

    loadRoster();
    return () => { active = false; };
  }, [rosterCourseId, rosterSessionId, router]);

  async function createInstructor(event) {
    event.preventDefault();
    setSaving('create');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, phone }),
      });
      const result = await response.json();
      if (result.staff) {
        setStaff((current) => [...current.filter((member) => member.id !== result.staff.id), result.staff]);
        setSelectedCourses((current) => ({ ...current, [result.staff.id]: [] }));
      }
      if (!response.ok) throw new Error(result.error || 'Could not issue instructor account.');
      setName('');
      setEmail('');
      setPhone('');
      setNotice('Instructor invitation sent by email and SMS.');
      await load();
    } catch (saveError) {
      await load();
      setError(saveError.message || 'Could not issue instructor account.');
    } finally {
      setSaving('');
    }
  }

  async function createCourse(event) {
    event.preventDefault();
    setSaving('course');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...courseForm,
          creditHours: Number(courseForm.creditHours),
          semesterNumber: Number(courseForm.semesterNumber),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create course.');
      setCourseForm({ title: '', code: '', programId: '', creditHours: '3', semesterNumber: '1', description: '' });
      setNotice('Course created. You can now assign it to an instructor.');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Could not create course.');
    } finally {
      setSaving('');
    }
  }

  async function createSession(event) {
    event.preventDefault();
    setSaving('session');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(sessionForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create session.');
      setSessionForm({ name: '', startDate: '', endDate: '', isCurrent: false });
      setNotice('Academic session created. It is now available for assignments and attendance.');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Could not create session.');
    } finally {
      setSaving('');
    }
  }

  async function updateInstructor(member, changes) {
    setSaving(member.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/academy/admin/staff/${encodeURIComponent(member.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(changes),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update instructor.');
      setNotice('Instructor account updated.');
      await load();
    } catch (saveError) {
      setError(saveError.message || 'Could not update instructor.');
    } finally {
      setSaving('');
    }
  }

  async function resendInvitation(member) {
    setSaving(member.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `/api/academy/admin/staff/${encodeURIComponent(member.id)}/invitation`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ phone: phoneDrafts[member.id] || '' }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not resend invitation.');
      setNotice(`A new setup link was sent to ${member.email} by email and SMS.`);
    } catch (saveError) {
      setError(saveError.message || 'Could not resend invitation.');
    } finally {
      setSaving('');
    }
  }

  function toggleCourse(member, courseId) {
    const current = selectedCourses[member.id] || [];
    const next = current.includes(courseId)
      ? current.filter((id) => id !== courseId)
      : [...current, courseId];
    setSelectedCourses((value) => ({ ...value, [member.id]: next }));
  }

  async function saveCourses(member) {
    await updateInstructor(member, { courseIds: selectedCourses[member.id] || [] });
  }

  return (
      <main className="ap-main">
        <header className="ap-page-head ap-admin-heading">
          <div>
            <h1>Instructor accounts</h1>
            <p>Issue invitations, moderate access, and assign courses.</p>
          </div>
        </header>

        {error && <div className="ap-error" role="alert">{error}</div>}
        {notice && <div className="ap-success" role="status">{notice}</div>}

        <section className="ap-card ap-section">
          <h2>Issue an instructor account</h2>
          <p className="ap-muted">The instructor receives a single-use setup link by email and SMS. The link expires after seven days.</p>
          <form onSubmit={createInstructor} className="ap-announcement-form">
            <label htmlFor="instructor-name">Full name</label>
            <input
              id="instructor-name"
              className="ap-input"
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <label htmlFor="instructor-email">Email</label>
            <input
              id="instructor-email"
              className="ap-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label htmlFor="instructor-phone">Mobile number for SMS</label>
            <input
              id="instructor-phone"
              className="ap-input"
              type="tel"
              autoComplete="tel"
              placeholder="024 123 4567 or +1 415 555 2671"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
            <small className="ap-muted">Use +country code for numbers outside Ghana.</small>
            <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'create'}>
              {saving === 'create' ? 'Issuing…' : 'Create and send invitation'}
            </button>
          </form>
        </section>

        <section className="ap-card ap-section">
          <h2>Create a course</h2>
          <p className="ap-muted">Add a course to the Academy catalog, then assign it to an instructor below.</p>
          <form onSubmit={createCourse} className="ap-form-grid">
            <label>Course title
              <input className="ap-input" maxLength={160} value={courseForm.title} onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })} required />
            </label>
            <label>Course code
              <input className="ap-input" maxLength={32} value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} required />
            </label>
            <label>Program
              <select className="ap-select" value={courseForm.programId} onChange={(event) => setCourseForm({ ...courseForm, programId: event.target.value })}>
                <option value="">No program selected</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </label>
            <label>Credit hours
              <input className="ap-input" type="number" min="1" max="30" value={courseForm.creditHours} onChange={(event) => setCourseForm({ ...courseForm, creditHours: event.target.value })} required />
            </label>
            <label>Semester
              <input className="ap-input" type="number" min="1" max="20" value={courseForm.semesterNumber} onChange={(event) => setCourseForm({ ...courseForm, semesterNumber: event.target.value })} required />
            </label>
            <label className="ap-form-wide">Description
              <textarea className="ap-input ap-textarea" rows={3} maxLength={3000} value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} />
            </label>
            <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'course'}>
              {saving === 'course' ? 'Creating…' : 'Create course'}
            </button>
          </form>
        </section>

        <section className="ap-section">
          <div className="ap-card-heading">
            <div>
              <h2>Course enrolments</h2>
              <p className="ap-muted">View active students enrolled in a course for an academic session.</p>
            </div>
            <span className="ap-muted">{roster.length} enrolled</span>
          </div>
          <div className="ap-form-grid">
            <label>Course
              <select
                className="ap-select"
                value={rosterCourseId}
                onChange={(event) => setRosterCourseId(event.target.value)}
                disabled={!courses.length}
              >
                <option value="">Choose a course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code ? `${course.code} · ` : ''}{course.title}
                  </option>
                ))}
              </select>
            </label>
            <label>Academic session
              <select
                className="ap-select"
                value={rosterSessionId}
                onChange={(event) => setRosterSessionId(event.target.value)}
                disabled={!sessions.length}
              >
                <option value="">Choose a session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}{session.is_current ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {rosterError && <div className="ap-error" role="alert">{rosterError}</div>}
          {rosterLoading ? <p>Loading enrolled students…</p> : roster.length ? (
            <div className="ap-table-wrap ap-card">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th scope="col">Student ID</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map((student) => (
                    <tr key={student.id}>
                      <td><Link href={`/academy/admin/students/${encodeURIComponent(student.id)}`}>{student.studentId || 'Not assigned'}</Link></td>
                      <td>{student.name}</td>
                      <td>{student.email || '—'}</td>
                      <td>{student.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !rosterError && courses.length && sessions.length ? (
            <div className="ap-card ap-empty"><p>No active students are enrolled in this course for the selected session.</p></div>
          ) : !courses.length || !sessions.length ? (
            <p className="ap-muted">Create a course and academic session to view enrolments.</p>
          ) : null}
        </section>

        <section className="ap-card ap-section">
          <h2>Academic sessions</h2>
          <p className="ap-muted">Sessions connect course assignments, rosters, and attendance records.</p>
          {sessions.length > 0 && (
            <div className="ap-stack ap-session-list">
              {sessions.map((session) => (
                <div className="ap-list-row" key={session.id}>
                  <strong>{session.name}</strong>
                  <span className="ap-muted">
                    {session.start_date || 'Start date not set'}
                    {session.end_date ? ` – ${session.end_date}` : ''}
                    {session.is_current ? ' · Current session' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={createSession} className="ap-form-grid">
            <label>Session name
              <input className="ap-input" maxLength={120} value={sessionForm.name} onChange={(event) => setSessionForm({ ...sessionForm, name: event.target.value })} required />
            </label>
            <label>Start date
              <input className="ap-input" type="date" value={sessionForm.startDate} onChange={(event) => setSessionForm({ ...sessionForm, startDate: event.target.value })} />
            </label>
            <label>End date
              <input className="ap-input" type="date" value={sessionForm.endDate} onChange={(event) => setSessionForm({ ...sessionForm, endDate: event.target.value })} />
            </label>
            <label className="ap-checkbox-label">
              <input type="checkbox" checked={sessionForm.isCurrent} onChange={(event) => setSessionForm({ ...sessionForm, isCurrent: event.target.checked })} />
              Set as current session
            </label>
            <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'session'}>
              {saving === 'session' ? 'Creating…' : 'Create session'}
            </button>
          </form>
        </section>

        <section className="ap-section">
          <h2>Instructor roster</h2>
          {loading ? <p>Loading instructor accounts…</p> : staff.length ? (
            <div className="ap-stack">
              {staff.map((member) => (
                <article className="ap-card" key={member.id}>
                  <div className="ap-card-heading">
                    <div>
                      <h3>{member.name}</h3>
                      <p className="ap-muted">{member.email}{member.phone ? ` · ${member.phone}` : ''}</p>
                    </div>
                    <span className={`ap-chip ${member.status === 'active' ? 'ap-chip-active' : 'ap-chip-neutral'}`}>
                      {member.status}
                    </span>
                  </div>
                  {member.status === 'pending' ? (
                    <div className="ap-instructor-invitation">
                      <label>
                        Mobile number for SMS
                        <input
                          className="ap-input"
                          type="tel"
                          autoComplete="tel"
                          placeholder="024 123 4567 or +1 415 555 2671"
                          value={phoneDrafts[member.id] || ''}
                          onChange={(event) => setPhoneDrafts((current) => ({
                            ...current,
                            [member.id]: event.target.value,
                          }))}
                        />
                        <small className="ap-muted">Use +country code for numbers outside Ghana.</small>
                      </label>
                      <button
                        className="ap-button"
                        onClick={() => resendInvitation(member)}
                        disabled={saving === member.id || !phoneDrafts[member.id]}
                      >
                        {saving === member.id ? 'Sending…' : 'Resend by email and SMS'}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="ap-button"
                      onClick={() => updateInstructor(member, {
                        status: member.status === 'active' ? 'inactive' : 'active',
                      })}
                      disabled={saving === member.id}
                    >
                      {saving === member.id
                        ? 'Saving…'
                        : member.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                    </button>
                  )}

                  <div className="ap-instructor-courses">
                    <h4>Assigned courses</h4>
                    {courses.length ? courses.map((course) => {
                      const assignedElsewhere = course.instructorStaffId && course.instructorStaffId !== member.id;
                      return (
                        <label className="ap-instructor-course" key={course.id}>
                          <input
                            type="checkbox"
                            checked={(selectedCourses[member.id] || []).includes(course.id)}
                            onChange={() => toggleCourse(member, course.id)}
                            disabled={saving === member.id}
                          />
                          <span>{course.title}{course.code ? ` (${course.code})` : ''}</span>
                          {assignedElsewhere && (
                            <small className="ap-muted">currently assigned to {course.instructorName || 'another instructor'}</small>
                          )}
                        </label>
                      );
                    }) : <p className="ap-muted">No Academy courses are available to assign.</p>}
                    <button
                      className="ap-button ap-button-primary"
                      onClick={() => saveCourses(member)}
                      disabled={saving === member.id}
                    >
                      {saving === member.id ? 'Saving…' : 'Save course assignments'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : !error ? (
            <div className="ap-card ap-empty"><p>No instructor accounts have been issued.</p></div>
          ) : null}
        </section>
      </main>
  );
}
