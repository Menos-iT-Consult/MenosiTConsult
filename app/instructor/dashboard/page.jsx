'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const TEACHING_TOOLS = [
  { key: 'assignments', title: 'Assignments', description: 'Create work and review submissions', icon: 'A' },
  { key: 'quizzes', title: 'Quizzes', description: 'Build and publish assessments', icon: 'Q' },
  { key: 'attendance', title: 'Attendance', description: 'Record attendance for a class session', icon: '✓' },
  { key: 'gradebook', title: 'Gradebook', description: 'Enter coursework and exam grades', icon: 'G' },
  { key: 'lessons', title: 'Lesson plans', description: 'Plan lessons and learning objectives', icon: 'L' },
  { key: 'lessons', title: 'Course materials', description: 'Share files and links with students', icon: 'M' },
];

function courseToolHref(courseId, tool) {
  return `/instructor/courses/${encodeURIComponent(courseId)}?tool=${encodeURIComponent(tool)}`;
}

export default function InstructorDashboard() {
  const router = useRouter();
  const [staff, setStaff] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
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
      setSelectedCourseId((current) => (
        results[0].some((course) => course.id === current) ? current : results[0][0]?.id || ''
      ));
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

  const now = Date.now();
  const reviewQueue = submissions
    .filter((submission) => submission.score == null)
    .slice(0, 5);
  const upcoming = assignments
    .filter((assignment) => assignment.dueAt && new Date(assignment.dueAt).getTime() >= now)
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .slice(0, 5);
  const dueThisWeekCount = assignments.filter((assignment) => {
    if (!assignment.dueAt) return false;
    const dueAt = new Date(assignment.dueAt).getTime();
    return dueAt >= now && dueAt <= now + 7 * 24 * 60 * 60 * 1000;
  }).length;
  const enrollmentCount = progress.reduce(
    (total, course) => total + (Number(course.rosterCount) || 0),
    0
  );
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const firstCourseHref = courses[0]
    ? `/instructor/courses/${encodeURIComponent(courses[0].id)}`
    : '#my-courses';

  return (
    <main className="ap-main ap-instructor-dashboard">
      <header className="ap-instructor-hero">
        <div className="ap-instructor-hero-copy">
          <p className="ap-instructor-kicker">MITA Academy · Instructor workspace</p>
          <h1>{staff ? `Welcome back, ${staff.name}` : 'Instructor dashboard'}</h1>
          <p>Plan your classes, support your students, and keep teaching tasks moving.</p>
        </div>
        <div className="ap-instructor-hero-actions">
          <Link className="ap-button ap-instructor-button-light" href={firstCourseHref}>
            {courses.length ? 'Open a course' : 'View my courses'}
          </Link>
          <button
            className="ap-button ap-instructor-button-quiet"
            type="button"
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh dashboard'}
          </button>
        </div>
        <div className="ap-instructor-hero-mark" aria-hidden="true">M</div>
      </header>

      {error && (
        <div className="ap-error ap-instructor-error" role="alert">
          <span>{error}</span>
          <button className="ap-link-button" type="button" onClick={load} disabled={loading}>
            Try again
          </button>
        </div>
      )}

      {loading ? <p className="ap-instructor-loading">Loading your instructor workspace…</p> : (
        <>
          <section className="ap-instructor-stat-grid" aria-label="Teaching overview">
            <article className="ap-card ap-instructor-stat">
              <span className="ap-instructor-stat-icon" aria-hidden="true">C</span>
              <div><p>Assigned courses</p><strong>{courses.length}</strong></div>
              <small>Ready in your workspace</small>
            </article>
            <article className="ap-card ap-instructor-stat">
              <span className="ap-instructor-stat-icon is-teal" aria-hidden="true">S</span>
              <div><p>Course enrollments</p><strong>{enrollmentCount}</strong></div>
              <small>Across your assigned courses</small>
            </article>
            <article className="ap-card ap-instructor-stat">
              <span className="ap-instructor-stat-icon is-amber" aria-hidden="true">!</span>
              <div><p>Submissions to review</p><strong>{submissions.filter((submission) => submission.score == null).length}</strong></div>
              <small>Waiting for your feedback</small>
            </article>
            <article className="ap-card ap-instructor-stat">
              <span className="ap-instructor-stat-icon is-violet" aria-hidden="true">D</span>
              <div><p>Due this week</p><strong>{dueThisWeekCount}</strong></div>
              <small>Assignment deadlines</small>
            </article>
          </section>

          <section className="ap-section ap-instructor-tools" id="teaching-tools">
            <div className="ap-section-heading ap-instructor-section-heading">
              <div>
                <p className="ap-eyebrow">Get things done</p>
                <h2>Teaching tools</h2>
                <p className="ap-muted">Choose a course, then jump straight into a teaching task.</p>
              </div>
              {courses.length > 0 && (
                <label className="ap-filter-field">
                  Course
                  <select
                    className="ap-select"
                    value={selectedCourseId}
                    onChange={(event) => setSelectedCourseId(event.target.value)}
                  >
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.code ? `${course.code} · ` : ''}{course.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="ap-instructor-tool-grid">
              {TEACHING_TOOLS.map((tool) => (
                <Link
                  className={`ap-card ap-instructor-tool${selectedCourse ? '' : ' is-unavailable'}`}
                  href={selectedCourse ? courseToolHref(selectedCourse.id, tool.key) : '#my-courses'}
                  key={`${tool.key}-${tool.title}`}
                  aria-label={selectedCourse ? `${tool.title} for ${selectedCourse.title}` : `${tool.title}: no course assigned`}
                >
                  <span className="ap-instructor-tool-icon" aria-hidden="true">{tool.icon}</span>
                  <span className="ap-instructor-tool-copy">
                    <strong>{tool.title}</strong>
                    <small>{tool.description}</small>
                  </span>
                  <span className="ap-instructor-tool-arrow" aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="ap-section" id="needs-review">
            <div className="ap-section-heading ap-instructor-section-heading">
              <div>
                <p className="ap-eyebrow">Student work</p>
                <h2>Needs your review</h2>
              </div>
              <span className="ap-instructor-count">{submissions.filter((submission) => submission.score == null).length} pending</span>
            </div>
            {reviewQueue.length ? (
              <div className="ap-card ap-instructor-review-list">
                {reviewQueue.map((submission) => {
                  const course = courses.find((item) => item.id === submission.courseId);
                  return (
                    <article className="ap-instructor-review-row" key={submission.id}>
                      <span className="ap-instructor-review-avatar" aria-hidden="true">
                        {(submission.studentName || 'S').trim().charAt(0).toUpperCase()}
                      </span>
                      <div className="ap-instructor-review-copy">
                        <strong>{submission.studentName || 'Student'}</strong>
                        <p>{submission.assignmentTitle || 'Assignment'} · {course?.title || 'Assigned course'}</p>
                      </div>
                      <time dateTime={submission.submittedAt}>
                        {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'Recently submitted'}
                      </time>
                      <Link
                        className="ap-button ap-instructor-review-action"
                        href={course ? courseToolHref(course.id, 'assignments') : '#my-courses'}
                      >
                        Review
                      </Link>
                    </article>
                  );
                })}
                {submissions.filter((submission) => submission.score == null).length > reviewQueue.length && (
                  <p className="ap-instructor-more">
                    {submissions.filter((submission) => submission.score == null).length - reviewQueue.length} more submissions are waiting in your course workspaces.
                  </p>
                )}
              </div>
            ) : (
              <div className="ap-card ap-empty ap-instructor-empty">
                <span className="ap-instructor-empty-mark" aria-hidden="true">✓</span>
                <div>
                  <h3>You’re all caught up</h3>
                  <p>No submissions are waiting for review.</p>
                </div>
              </div>
            )}
          </section>

          <section className="ap-section" id="course-progress">
            <div className="ap-section-heading ap-instructor-section-heading">
              <div>
                <p className="ap-eyebrow">Classroom pulse</p>
                <h2>Course progress</h2>
              </div>
            </div>
            {progress.length ? (
              <div className="ap-course-grid">
                {progress.map((course) => (
                  <article className="ap-card ap-instructor-progress-card" key={course.courseId}>
                    <p className="ap-eyebrow">{course.courseCode || 'Course'}</p>
                    <h3>{course.courseTitle}</h3>
                    <div className="ap-instructor-progress-stats">
                      <span><strong>{course.rosterCount}</strong> enrolled</span>
                      <span><strong>{course.ungradedSubmissionCount}</strong> to review</span>
                    </div>
                    <p className="ap-instructor-attendance-summary">
                      Attendance · {course.attendanceRecordCount} recorded
                      <span>Present {course.presentCount} · Late {course.lateCount} · Absent {course.absentCount}</span>
                    </p>
                    <p className="ap-muted">
                      {course.missingSubmissionCount} missing submissions across {course.missingStudentCount} students
                    </p>
                    <Link className="ap-link" href={`/instructor/courses/${encodeURIComponent(course.courseId)}`}>
                      Open course workspace <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ap-card ap-empty"><p>No course progress is available yet.</p></div>
            )}
          </section>

          <section className="ap-section" id="my-courses">
            <div className="ap-section-heading ap-instructor-section-heading">
              <div>
                <p className="ap-eyebrow">Your classroom</p>
                <h2>My courses</h2>
                <p className="ap-muted">Only courses assigned to you by an Academy administrator appear here.</p>
              </div>
            </div>
            {courses.length ? (
              <div className="ap-course-grid">
                {courses.map((course) => {
                  const courseProgress = progress.find((item) => item.courseId === course.id);
                  return (
                    <article className="ap-card ap-course-card ap-instructor-course-card" key={course.id}>
                      <p className="ap-eyebrow">{course.code || 'Course'}</p>
                      <h3>{course.title}</h3>
                      <p>{course.description || 'Course teaching workspace'}</p>
                      <div className="ap-instructor-course-meta">
                        <span>{courseProgress?.rosterCount || 0} enrolled</span>
                        <span>{courseProgress?.ungradedSubmissionCount || 0} to review</span>
                      </div>
                      <Link className="ap-button ap-button-primary" href={`/instructor/courses/${encodeURIComponent(course.id)}`}>
                        Open course workspace
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="ap-card ap-empty ap-instructor-empty">
                <div>
                  <h3>No courses assigned</h3>
                  <p>Contact an Academy administrator to have courses assigned to your account.</p>
                </div>
              </div>
            )}
          </section>

          <section className="ap-section" id="upcoming-deadlines">
            <div className="ap-section-heading ap-instructor-section-heading">
              <div>
                <p className="ap-eyebrow">Plan ahead</p>
                <h2>Upcoming deadlines</h2>
              </div>
            </div>
            {upcoming.length ? (
              <div className="ap-card ap-instructor-deadlines">
                {upcoming.map((assignment) => (
                  <div className="ap-instructor-deadline-row" key={assignment.id}>
                    <span className="ap-instructor-deadline-date">
                      <strong>{new Date(assignment.dueAt).toLocaleDateString(undefined, { day: '2-digit' })}</strong>
                      <small>{new Date(assignment.dueAt).toLocaleDateString(undefined, { month: 'short' })}</small>
                    </span>
                    <div className="ap-instructor-deadline-copy">
                      <strong>{assignment.title}</strong>
                      <p>{courses.find((course) => course.id === assignment.courseId)?.title || 'Assigned course'}</p>
                    </div>
                    <time dateTime={assignment.dueAt}>
                      {new Date(assignment.dueAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </time>
                    <Link
                      className="ap-link"
                      href={courseToolHref(assignment.courseId, 'assignments')}
                      aria-label={`Open ${assignment.title} in its course`}
                    >
                      Open <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ap-card ap-empty ap-instructor-empty"><p>No upcoming assignment deadlines.</p></div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
