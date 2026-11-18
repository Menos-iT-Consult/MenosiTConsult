'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const TABS = ['Overview', 'Assignments', 'Gradebook', 'Attendance', 'Lesson plans'];
const ATTENDANCE_STATUSES = [
  ['present', 'Present'],
  ['absent', 'Absent'],
  ['late', 'Late'],
  ['excused', 'Excused'],
];

function localDateValue() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

async function readResult(response, fallback) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

export default function InstructorCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = decodeURIComponent(String(params.courseId || ''));
  const [course, setCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [gradebook, setGradebook] = useState([]);
  const [tab, setTab] = useState('Overview');
  const [sessionId, setSessionId] = useState('');
  const [meetingDate, setMeetingDate] = useState(localDateValue);
  const [attendance, setAttendance] = useState({});
  const [attendanceNotes, setAttendanceNotes] = useState({});
  const [lessonPlans, setLessonPlans] = useState([]);
  const [lessonForm, setLessonForm] = useState({
    lessonDate: '', sessionId: '', title: '', objectives: '', notes: '', resources: '',
  });
  const [editingLessonId, setEditingLessonId] = useState('');
  const [assignmentForm, setAssignmentForm] = useState({
    title: '', instructions: '', dueAt: '', maxScore: '100',
  });
  const [gradeForms, setGradeForms] = useState({});
  const [submissionForms, setSubmissionForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sessionResponse = await fetch('/api/academy/staff/auth/me', { credentials: 'include' });
      if (!sessionResponse.ok) {
        const sessionError = await sessionResponse.json();
        throw new Error(sessionError.error || 'Could not verify instructor session.');
      }
      const session = await sessionResponse.json();
      if (!session.loggedIn || !session.staff) {
        router.replace('/instructor/login');
        return;
      }
      if (session.staff.role !== 'instructor') {
        router.replace('/academy/admin/announcements');
        return;
      }

      const [courseResponse, submissionResponse, gradeResponse] = await Promise.all([
        fetch(`/api/academy/instructor/courses/${encodeURIComponent(courseId)}`, { credentials: 'include' }),
        fetch(`/api/academy/instructor/submissions?course_id=${encodeURIComponent(courseId)}`, { credentials: 'include' }),
        fetch(`/api/academy/instructor/grades?course_id=${encodeURIComponent(courseId)}`, { credentials: 'include' }),
      ]);
      const [courseData, submissionData, gradeData] = await Promise.all([
        readResult(courseResponse, 'Could not load this course.'),
        readResult(submissionResponse, 'Could not load submissions.'),
        readResult(gradeResponse, 'Could not load the gradebook.'),
      ]);
      setCourse(courseData.course);
      setRoster(courseData.roster);
      setAssignments(courseData.assignments);
      setSessions(courseData.sessions);
      setSubmissions(submissionData);
      setGradebook(gradeData);
      setSubmissionForms(Object.fromEntries(submissionData.map((item) => [
        item.id,
        { score: item.score == null ? '' : String(item.score), feedback: item.feedback || '' },
      ])));
      setGradeForms(Object.fromEntries(gradeData.map((item) => [
        item.enrollmentId,
        { ca: item.ca == null ? '' : String(item.ca), exam: item.exam == null ? '' : String(item.exam) },
      ])));
      setSessionId((current) => current || courseData.sessions.find((sessionItem) => sessionItem.is_current)?.id ||
        courseData.roster[0]?.sessionId || courseData.sessions[0]?.id || '');
    } catch (loadError) {
      setError(loadError.message || 'Could not load course workspace.');
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const selectedRoster = useMemo(
    () => roster.filter((student) => student.sessionId === sessionId),
    [roster, sessionId]
  );

  const loadAttendance = useCallback(async () => {
    if (!courseId || !sessionId || !meetingDate) return;
    try {
      const query = new URLSearchParams({
        course_id: courseId,
        session_id: sessionId,
        meeting_date: meetingDate,
      });
      const response = await fetch(`/api/academy/instructor/attendance?${query}`, { credentials: 'include' });
      const records = await readResult(response, 'Could not load attendance.');
      setAttendance(Object.fromEntries(records.map((record) => [record.studentId, record.status])));
      setAttendanceNotes(Object.fromEntries(records.map((record) => [record.studentId, record.note || ''])));
    } catch (loadError) {
      setError(loadError.message || 'Could not load attendance.');
    }
  }, [courseId, meetingDate, sessionId]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const loadLessons = useCallback(async () => {
    if (!courseId) return;
    try {
      const response = await fetch(
        `/api/academy/instructor/lessons?course_id=${encodeURIComponent(courseId)}`,
        { credentials: 'include' }
      );
      setLessonPlans(await readResult(response, 'Could not load lesson plans.'));
    } catch (loadError) {
      setError(loadError.message || 'Could not load lesson plans.');
    }
  }, [courseId]);

  useEffect(() => { loadLessons(); }, [loadLessons]);

  async function signOut() {
    setError('');
    try {
      const response = await fetch('/api/academy/staff/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      router.replace('/instructor/login');
    } catch (signOutError) {
      setError(signOutError.message || 'Could not sign out.');
    }
  }

  async function createAssignment(event) {
    event.preventDefault();
    setSaving('assignment');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/instructor/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId,
          sessionId,
          ...assignmentForm,
          maxScore: Number(assignmentForm.maxScore),
          dueAt: assignmentForm.dueAt ? new Date(assignmentForm.dueAt).toISOString() : null,
        }),
      });
      await readResult(response, 'Could not create assignment.');
      setAssignmentForm({ title: '', instructions: '', dueAt: '', maxScore: '100' });
      setNotice('Assignment created.');
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError.message || 'Could not create assignment.');
    } finally {
      setSaving('');
    }
  }

  async function saveSubmission(submission) {
    const form = submissionForms[submission.id] || {};
    setSaving(`submission-${submission.id}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/academy/instructor/submissions/${encodeURIComponent(submission.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ score: Number(form.score), feedback: form.feedback || '' }),
      });
      await readResult(response, 'Could not save submission feedback.');
      setNotice('Submission feedback saved.');
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError.message || 'Could not save submission feedback.');
    } finally {
      setSaving('');
    }
  }

  async function saveGrade(student) {
    const form = gradeForms[student.enrollmentId] || {};
    setSaving(`grade-${student.enrollmentId}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/instructor/grades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enrollmentId: student.enrollmentId,
          ca: Number(form.ca),
          exam: Number(form.exam),
        }),
      });
      await readResult(response, 'Could not save grade.');
      setNotice(`Grade saved for ${student.studentName}.`);
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError.message || 'Could not save grade.');
    } finally {
      setSaving('');
    }
  }

  async function saveAttendance(event) {
    event.preventDefault();
    const records = selectedRoster
      .filter((student) => attendance[student.studentId])
      .map((student) => ({
        studentId: student.studentId,
        status: attendance[student.studentId],
        note: attendanceNotes[student.studentId] || '',
      }));
    setSaving('attendance');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/academy/instructor/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId, sessionId, meetingDate, records }),
      });
      const result = await readResult(response, 'Could not save attendance.');
      setNotice(`Attendance saved for ${result.saved} student${result.saved === 1 ? '' : 's'}.`);
      await loadAttendance();
    } catch (saveError) {
      setError(saveError.message || 'Could not save attendance.');
    } finally {
      setSaving('');
    }
  }

  async function saveLesson(event) {
    event.preventDefault();
    setSaving('lesson');
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        editingLessonId
          ? `/api/academy/instructor/lessons/${encodeURIComponent(editingLessonId)}`
          : '/api/academy/instructor/lessons',
        {
          method: editingLessonId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...lessonForm, courseId }),
        }
      );
      await readResult(response, 'Could not save lesson plan.');
      setLessonForm({ lessonDate: '', sessionId: '', title: '', objectives: '', notes: '', resources: '' });
      setEditingLessonId('');
      setNotice(editingLessonId ? 'Lesson plan updated.' : 'Lesson plan saved.');
      await loadLessons();
    } catch (saveError) {
      setError(saveError.message || 'Could not save lesson plan.');
    } finally {
      setSaving('');
    }
  }

  function editLesson(lesson) {
    setEditingLessonId(lesson.id);
    setLessonForm({
      lessonDate: lesson.lessonDate || '',
      sessionId: lesson.sessionId || '',
      title: lesson.title || '',
      objectives: lesson.objectives || '',
      notes: lesson.notes || '',
      resources: lesson.resources || '',
    });
    setTab('Lesson plans');
  }

  async function deleteLesson(lesson) {
    if (!window.confirm(`Delete the lesson plan “${lesson.title}”?`)) return;
    setSaving(`delete-${lesson.id}`);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/academy/instructor/lessons/${encodeURIComponent(lesson.id)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await readResult(response, 'Could not delete lesson plan.');
      setNotice('Lesson plan deleted.');
      await loadLessons();
    } catch (deleteError) {
      setError(deleteError.message || 'Could not delete lesson plan.');
    } finally {
      setSaving('');
    }
  }

  if (loading) {
    return <div className="ap"><main className="ap-main"><p>Loading course workspace…</p></main></div>;
  }

  if (!course) {
    return (
      <div className="ap">
        <main className="ap-main">
          <div className="ap-error" role="alert">{error || 'Course not found or not assigned to your account.'}</div>
          <Link className="ap-button" href="/instructor/dashboard">Back to dashboard</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="ap">
      <main className="ap-main">
        <header className="ap-page-head">
          <div>
            <Link className="ap-muted" href="/instructor/dashboard">← My courses</Link>
            <p className="ap-eyebrow">{course.code || 'Course workspace'}</p>
            <h1>{course.title}</h1>
            <p>{course.description}</p>
          </div>
          <button className="ap-button" onClick={signOut}>Sign out</button>
        </header>

        {error && <div className="ap-error" role="alert">{error}</div>}
        {notice && <div className="ap-success" role="status">{notice}</div>}
        <nav className="ap-tabs" aria-label="Course teaching tools">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              className={`ap-tab ${tab === item ? 'is-active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        {tab === 'Overview' && (
          <section className="ap-course-grid">
            <article className="ap-card">
              <h2>Course roster</h2>
              <p className="ap-muted">{roster.length} enrolled student{roster.length === 1 ? '' : 's'} across sessions.</p>
              {roster.slice(0, 8).map((student) => (
                <div className="ap-list-row" key={student.enrollmentId}>
                  <strong>{student.studentName}</strong>
                  <span>{student.sessionName || 'Session'}</span>
                </div>
              ))}
              {roster.length > 8 && <p className="ap-muted">Open Attendance or Gradebook to see the full roster.</p>}
              {!roster.length && <p className="ap-muted">No students are enrolled in this course yet.</p>}
            </article>
            <article className="ap-card">
              <h2>Teaching overview</h2>
              <p>{assignments.length} assignments · {submissions.length} submissions · {lessonPlans.length} lesson plans</p>
              <p>{submissions.filter((submission) => submission.score == null).length} submissions still need review.</p>
              <div className="ap-actions">
                <button className="ap-button ap-button-primary" onClick={() => setTab('Assignments')}>Create assignment</button>
                <button className="ap-button" onClick={() => setTab('Attendance')}>Take attendance</button>
              </div>
            </article>
          </section>
        )}

        {tab === 'Assignments' && (
          <section className="ap-section">
            <article className="ap-card ap-section">
              <h2>Create an assignment</h2>
              <form className="ap-form-grid" onSubmit={createAssignment}>
                <label>Session
                  <select className="ap-select" value={sessionId} onChange={(event) => setSessionId(event.target.value)} required>
                    <option value="">Select a session</option>
                    {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
                  </select>
                </label>
                <label>Title
                  <input className="ap-input" maxLength={160} value={assignmentForm.title} onChange={(event) => setAssignmentForm({ ...assignmentForm, title: event.target.value })} required />
                </label>
                <label>Deadline
                  <input className="ap-input" type="datetime-local" value={assignmentForm.dueAt} onChange={(event) => setAssignmentForm({ ...assignmentForm, dueAt: event.target.value })} />
                </label>
                <label>Maximum score
                  <input className="ap-input" type="number" min="1" step="0.5" value={assignmentForm.maxScore} onChange={(event) => setAssignmentForm({ ...assignmentForm, maxScore: event.target.value })} required />
                </label>
                <label className="ap-form-wide">Instructions
                  <textarea className="ap-input ap-textarea" rows={4} maxLength={10000} value={assignmentForm.instructions} onChange={(event) => setAssignmentForm({ ...assignmentForm, instructions: event.target.value })} />
                </label>
                <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'assignment' || !sessionId}>
                  {saving === 'assignment' ? 'Creating…' : 'Create assignment'}
                </button>
              </form>
            </article>

            <h2>Assignments and submissions</h2>
            {assignments.length ? assignments.map((assignment) => (
              <article className="ap-card ap-section" key={assignment.id}>
                <div className="ap-card-heading">
                  <div>
                    <h3>{assignment.title}</h3>
                    <p className="ap-muted">
                      {sessions.find((session) => session.id === assignment.sessionId)?.name || 'Session'}
                      {assignment.dueAt ? ` · Due ${new Date(assignment.dueAt).toLocaleString()}` : ' · No deadline'}
                      {` · ${assignment.maxScore} points`}
                    </p>
                  </div>
                </div>
                {assignment.instructions && <p>{assignment.instructions}</p>}
                {submissions.filter((submission) => submission.assignmentId === assignment.id).length ? (
                  <div className="ap-stack">
                    {submissions.filter((submission) => submission.assignmentId === assignment.id).map((submission) => (
                      <div className="ap-submission" key={submission.id}>
                        <div>
                          <strong>{submission.studentName}</strong>
                          {submission.studentNumber && <span className="ap-muted"> · {submission.studentNumber}</span>}
                          <p className="ap-muted">Submitted {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : ''}</p>
                          {submission.text && <p className="ap-submission-text">{submission.text}</p>}
                          {submission.file && <a href={submission.file} target="_blank" rel="noreferrer">Open submitted file</a>}
                        </div>
                        <div className="ap-form-grid ap-review-form">
                          <label>Score
                            <input
                              className="ap-input"
                              type="number"
                              min="0"
                              max={assignment.maxScore}
                              step="0.5"
                              value={submissionForms[submission.id]?.score ?? ''}
                              onChange={(event) => setSubmissionForms((current) => ({
                                ...current,
                                [submission.id]: { ...current[submission.id], score: event.target.value },
                              }))}
                            />
                          </label>
                          <label>Feedback
                            <textarea
                              className="ap-input ap-textarea"
                              rows={2}
                              maxLength={5000}
                              value={submissionForms[submission.id]?.feedback ?? ''}
                              onChange={(event) => setSubmissionForms((current) => ({
                                ...current,
                                [submission.id]: { ...current[submission.id], feedback: event.target.value },
                              }))}
                            />
                          </label>
                          <button
                            className="ap-button ap-button-primary"
                            onClick={() => saveSubmission(submission)}
                            disabled={saving === `submission-${submission.id}` || submissionForms[submission.id]?.score === ''}
                          >
                            {saving === `submission-${submission.id}` ? 'Saving…' : 'Save review'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="ap-muted">No submissions yet.</p>}
              </article>
            )) : <div className="ap-card ap-empty"><p>No assignments have been created for this course.</p></div>}
          </section>
        )}

        {tab === 'Gradebook' && (
          <section className="ap-section">
            <h2>Gradebook</h2>
            {gradebook.length ? (
              <div className="ap-card ap-table-wrap">
                <table className="ap-table">
                  <thead><tr><th>Student</th><th>Session</th><th>CA (30%)</th><th>Exam (70%)</th><th>Total</th><th>Letter</th><th /></tr></thead>
                  <tbody>
                    {gradebook.map((student) => (
                      <tr key={student.enrollmentId}>
                        <td>{student.studentName}<small>{student.studentNumber}</small></td>
                        <td>{sessions.find((session) => session.id === student.sessionId)?.name || 'Session'}</td>
                        <td><input className="ap-input ap-grade-input" type="number" min="0" max="100" step="0.5" value={gradeForms[student.enrollmentId]?.ca ?? ''} onChange={(event) => setGradeForms((current) => ({ ...current, [student.enrollmentId]: { ...current[student.enrollmentId], ca: event.target.value } }))} /></td>
                        <td><input className="ap-input ap-grade-input" type="number" min="0" max="100" step="0.5" value={gradeForms[student.enrollmentId]?.exam ?? ''} onChange={(event) => setGradeForms((current) => ({ ...current, [student.enrollmentId]: { ...current[student.enrollmentId], exam: event.target.value } }))} /></td>
                        <td>{student.total == null ? '—' : student.total.toFixed(1)}</td>
                        <td>{student.letter || '—'}</td>
                        <td><button className="ap-button ap-button-primary" onClick={() => saveGrade(student)} disabled={saving === `grade-${student.enrollmentId}`}>{saving === `grade-${student.enrollmentId}` ? 'Saving…' : 'Save'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="ap-card ap-empty"><p>No enrolled students are available for grading.</p></div>}
          </section>
        )}

        {tab === 'Attendance' && (
          <section className="ap-section">
            <h2>Attendance</h2>
            <div className="ap-card ap-attendance-filter">
              <label>Session
                <select className="ap-select" value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
                  <option value="">Select a session</option>
                  {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
                </select>
              </label>
              <label>Class date
                <input className="ap-input" type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} />
              </label>
            </div>
            <form onSubmit={saveAttendance} className="ap-card ap-section">
              {selectedRoster.length ? (
                <>
                  {selectedRoster.map((student) => (
                    <div className="ap-attendance-row" key={student.enrollmentId}>
                      <div><strong>{student.studentName}</strong><small>{student.studentNumber}</small></div>
                      <select
                        className="ap-select"
                        aria-label={`Attendance for ${student.studentName}`}
                        value={attendance[student.studentId] || ''}
                        onChange={(event) => setAttendance((current) => ({ ...current, [student.studentId]: event.target.value }))}
                      >
                        <option value="">Not marked</option>
                        {ATTENDANCE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <input
                        className="ap-input"
                        aria-label={`Attendance note for ${student.studentName}`}
                        placeholder="Optional note"
                        maxLength={500}
                        value={attendanceNotes[student.studentId] || ''}
                        onChange={(event) => setAttendanceNotes((current) => ({ ...current, [student.studentId]: event.target.value }))}
                      />
                    </div>
                  ))}
                  <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'attendance' || !sessionId || !meetingDate}>
                    {saving === 'attendance' ? 'Saving…' : 'Save attendance'}
                  </button>
                </>
              ) : <p className="ap-muted">No students are enrolled in the selected session.</p>}
            </form>
          </section>
        )}

        {tab === 'Lesson plans' && (
          <section className="ap-section">
            <article className="ap-card ap-section">
              <h2>{editingLessonId ? 'Edit lesson plan' : 'Plan a lesson'}</h2>
              <form className="ap-form-grid" onSubmit={saveLesson}>
                <label>Session
                  <select className="ap-select" value={lessonForm.sessionId} onChange={(event) => setLessonForm({ ...lessonForm, sessionId: event.target.value })}>
                    <option value="">No session selected</option>
                    {sessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
                  </select>
                </label>
                <label>Lesson date
                  <input className="ap-input" type="date" value={lessonForm.lessonDate} onChange={(event) => setLessonForm({ ...lessonForm, lessonDate: event.target.value })} />
                </label>
                <label className="ap-form-wide">Lesson title
                  <input className="ap-input" maxLength={160} value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required />
                </label>
                <label className="ap-form-wide">Learning objectives
                  <textarea className="ap-input ap-textarea" rows={3} maxLength={5000} value={lessonForm.objectives} onChange={(event) => setLessonForm({ ...lessonForm, objectives: event.target.value })} />
                </label>
                <label className="ap-form-wide">Teaching notes and activities
                  <textarea className="ap-input ap-textarea" rows={4} maxLength={10000} value={lessonForm.notes} onChange={(event) => setLessonForm({ ...lessonForm, notes: event.target.value })} />
                </label>
                <label className="ap-form-wide">Resources
                  <textarea className="ap-input ap-textarea" rows={2} maxLength={5000} placeholder="Links or materials to prepare" value={lessonForm.resources} onChange={(event) => setLessonForm({ ...lessonForm, resources: event.target.value })} />
                </label>
                <div className="ap-actions">
                  <button className="ap-button ap-button-primary" type="submit" disabled={saving === 'lesson'}>
                    {saving === 'lesson' ? 'Saving…' : editingLessonId ? 'Update lesson plan' : 'Save lesson plan'}
                  </button>
                  {editingLessonId && <button className="ap-button" type="button" onClick={() => { setEditingLessonId(''); setLessonForm({ lessonDate: '', sessionId: '', title: '', objectives: '', notes: '', resources: '' }); }}>Cancel edit</button>}
                </div>
              </form>
            </article>

            <h2>Planned lessons</h2>
            {lessonPlans.length ? (
              <div className="ap-stack">
                {lessonPlans.map((lesson) => (
                  <article className="ap-card" key={lesson.id}>
                    <div className="ap-card-heading">
                      <div>
                        <h3>{lesson.title}</h3>
                        <p className="ap-muted">
                          {lesson.lessonDate ? new Date(`${lesson.lessonDate}T00:00:00`).toLocaleDateString() : 'Date not set'}
                          {lesson.sessionId ? ` · ${sessions.find((session) => session.id === lesson.sessionId)?.name || 'Session'}` : ''}
                        </p>
                      </div>
                      <div className="ap-actions">
                        <button className="ap-button" onClick={() => editLesson(lesson)}>Edit</button>
                        <button className="ap-button ap-button-danger" onClick={() => deleteLesson(lesson)} disabled={saving === `delete-${lesson.id}`}>Delete</button>
                      </div>
                    </div>
                    {lesson.objectives && <p><strong>Objectives:</strong> {lesson.objectives}</p>}
                    {lesson.notes && <p className="ap-announcement-body">{lesson.notes}</p>}
                    {lesson.resources && <p><strong>Resources:</strong> {lesson.resources}</p>}
                  </article>
                ))}
              </div>
            ) : <div className="ap-card ap-empty"><p>No lesson plans yet.</p></div>}
          </section>
        )}
      </main>
    </div>
  );
}
