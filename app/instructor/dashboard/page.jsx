'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function InstructorDashboard() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const sessionResponse = await fetch('/api/academy/staff/auth/me', { credentials: 'include' });
      const session = await sessionResponse.json();
      if (!session.loggedIn || !session.staff) {
        router.replace('/instructor/login');
        return;
      }
      if (session.staff.role !== 'instructor') {
        router.replace('/academy/admin/announcements');
        return;
      }
      setStaff(session.staff);

      const responses = await Promise.all([
        fetch('/api/academy/instructor/courses', { credentials: 'include' }),
        fetch('/api/academy/instructor/assignments', { credentials: 'include' }),
        fetch('/api/academy/instructor/submissions', { credentials: 'include' }),
        fetch('/api/academy/instructor/progress', { credentials: 'include' }),
      ]);
      const results = await Promise.all(responses.map((response) => response.json()));
      const failed = responses.findIndex((response) => !response.ok);
      if (failed >= 0) throw new Error(results[failed].error || 'Could not load instructor workspace.');
      setCourses(results[0]);
      setAssignments(results[1]);
      setSubmissions(results[2]);
      setProgress(results[3]);
    } catch (loadError) {
      setError(loadError.message || 'Could not load your instructor workspace.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

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

  const now = Date.now();
  const upcoming = assignments
    .filter((assignment) => assignment.dueAt && new Date(assignment.dueAt).getTime() >= now)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 5);

  return (
    <div className="ap">
      <main className="ap-main">
        <header className="ap-page-head">
          <div>
            <p className="ap-eyebrow">MITA Academy</p>
            <h1>{staff ? `Welcome, ${staff.name}` : 'Instructor dashboard'}</h1>
            <p>Manage your assigned courses, student work, and teaching plans.</p>
          </div>
          <button className="ap-button" onClick={signOut}>Sign out</button>
        </header>

        {error && <div className="ap-error" role="alert">{error}</div>}
        {loading ? <p>Loading your instructor workspace…</p> : (
          <>
            <section className="ap-metric-grid" aria-label="Teaching overview">
              <article className="ap-card ap-metric">
                <span>Assigned courses</span>
                <strong>{courses.length}</strong>
              </article>
              <article className="ap-card ap-metric">
                <span>Assignments</span>
                <strong>{assignments.length}</strong>
              </article>
              <article className="ap-card ap-metric">
                <span>Submissions to review</span>
                <strong>{submissions.filter((submission) => submission.score == null).length}</strong>
              </article>
            </section>

            <section className="ap-section">
              <h2>Course progress</h2>
              {progress.length ? (
                <div className="ap-course-grid">
                  {progress.map((course) => (
                    <article className="ap-card" key={course.courseId}>
                      <p className="ap-eyebrow">{course.courseCode || 'Course'}</p>
                      <h3>{course.courseTitle}</h3>
                      <p>{course.rosterCount} enrolled students</p>
                      <p>
                        Attendance recorded: {course.attendanceRecordCount}
                        {' · '}Present {course.presentCount}
                        {' · '}Late {course.lateCount}
                        {' · '}Absent {course.absentCount}
                      </p>
                      <p>
                        {course.missingSubmissionCount} missing submissions across {course.missingStudentCount} students
                      </p>
                      <p>{course.ungradedSubmissionCount} submissions awaiting review</p>
                      <Link className="ap-link" href={`/instructor/courses/${encodeURIComponent(course.courseId)}`}>
                        Open course workspace
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="ap-card ap-empty"><p>No course progress is available yet.</p></div>
              )}
            </section>

            <section className="ap-section">
              <div className="ap-section-heading">
                <div>
                  <h2>My courses</h2>
                  <p className="ap-muted">Only courses assigned to you by an Academy administrator appear here.</p>
                </div>
              </div>
              {courses.length ? (
                <div className="ap-course-grid">
                  {courses.map((course) => (
                    <article className="ap-card ap-course-card" key={course.id}>
                      <p className="ap-eyebrow">{course.code || 'Course'}</p>
                      <h3>{course.title}</h3>
                      <p>{course.description || 'Course teaching workspace'}</p>
                      <Link className="ap-button ap-button-primary" href={`/instructor/courses/${encodeURIComponent(course.id)}`}>
                        Open course workspace
                      </Link>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="ap-card ap-empty">
                  <h3>No courses assigned</h3>
                  <p>Contact an Academy administrator to have courses assigned to your account.</p>
                </div>
              )}
            </section>

            <section className="ap-section">
              <h2>Upcoming deadlines</h2>
              {upcoming.length ? (
                <div className="ap-card ap-stack">
                  {upcoming.map((assignment) => (
                    <div className="ap-list-row" key={assignment.id}>
                      <div>
                        <strong>{assignment.title}</strong>
                        <p className="ap-muted">
                          {courses.find((course) => course.id === assignment.courseId)?.title || 'Assigned course'}
                        </p>
                      </div>
                      <time dateTime={assignment.dueAt}>{new Date(assignment.dueAt).toLocaleString()}</time>
                    </div>
                  ))}
                </div>
              ) : <div className="ap-card ap-empty"><p>No upcoming assignment deadlines.</p></div>}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
