'use client';

import Link from 'next/link';
import useStudentPortalData from '../useStudentPortalData';
import { getNextClass } from '../../../../lib/academy-portal';

function formatDate(value) {
  if (!value) return 'Date to be announced';
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function currency(value) {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function StudentDashboardPage() {
  const { data, loading, error, reload } = useStudentPortalData();

  if (loading) return <main className="ap-main"><p>Loading your dashboard…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const enrollments = data.enrollments || [];
  const assignments = data.assignments || [];
  const exams = data.exams || [];
  const unpaidInvoices = (data.invoices || []).filter((invoice) => invoice.status !== 'paid');
  const upcomingAssignments = assignments
    .filter((assignment) => !assignment.submission_id && assignment.due_at && new Date(assignment.due_at) >= new Date())
    .slice(0, 4);
  const upcomingExams = exams
    .filter((exam) => exam.date && new Date(`${exam.date}T00:00:00`) >= new Date(new Date().toDateString()))
    .slice(0, 3);
  const nextClass = getNextClass(data.timetable || []);

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Welcome back, {data.student.firstName}</h1>
        <p>Here’s what’s happening with your studies.</p>
      </header>

      {data.student.mustChangePassword && (
        <div className="ap-notice">
          <h2>Change your default password</h2>
          <p>For your account’s safety, update the password issued by the academy.</p>
          <Link href="/academy/change-password" className="ap-link">Change password</Link>
        </div>
      )}

      <section className="ap-stat-grid" aria-label="Study overview">
        <article className="ap-stat">
          <span>Enrolled courses</span>
          <strong>{enrollments.length}</strong>
          <Link href="/academy/courses">View courses</Link>
        </article>
        <article className="ap-stat">
          <span>Assignments to submit</span>
          <strong>{assignments.filter((assignment) => !assignment.submission_id).length}</strong>
          <Link href="/academy/assignments">View work</Link>
        </article>
        <article className="ap-stat">
          <span>Upcoming exams</span>
          <strong>{upcomingExams.length}</strong>
          <Link href="/academy/reports">See exam dates</Link>
        </article>
        <article className="ap-stat">
          <span>Outstanding fees</span>
          <strong>{unpaidInvoices.length}</strong>
          <small>{currency(unpaidInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0))}</small>
          <Link href="/academy/fees">View fees</Link>
        </article>
        <article className="ap-stat">
          <span>Notifications</span>
          <strong>{data.unreadNotificationCount || 0}</strong>
          <Link href="/academy/notifications">View notifications</Link>
        </article>
      </section>

      <div className="ap-grid-2 ap-dashboard-sections">
        <section className="ap-card">
          <div className="ap-card-heading">
            <h2>Next class</h2>
            <Link href="/academy/timetable">Full timetable</Link>
          </div>
          {nextClass ? (
            <div className="ap-next-class">
              <span className="ap-chip ap-chip-active">{nextClass.dayLabel} · {nextClass.start_time}</span>
              <strong>{nextClass.course_title || 'Class session'}</strong>
              <p>{nextClass.venue || 'Venue to be announced'} · {nextClass.session_name || 'Current session'}</p>
            </div>
          ) : <p className="ap-muted">No class sessions have been scheduled.</p>}
        </section>

        <section className="ap-card">
          <div className="ap-card-heading">
            <h2>Course progress</h2>
            <Link href="/academy/courses">All courses</Link>
          </div>
          {(data.courseProgress || []).length ? (
            <div className="ap-progress-list">
              {data.courseProgress.slice(0, 4).map((course) => (
                <div key={course.courseId} className="ap-dashboard-progress">
                  <div className="ap-card-heading">
                    <strong>{course.courseTitle}</strong>
                    <span>{course.percentage}%</span>
                  </div>
                  <div
                    className="ap-progress-track"
                    role="progressbar"
                    aria-label={`${course.courseTitle} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={course.percentage}
                  >
                    <span style={{ width: `${course.percentage}%` }} />
                  </div>
                  <small>
                    {course.completed} of {course.total} lessons complete
                    {course.nextLesson ? ` · Next: ${course.nextLesson.title}` : ' · Course complete'}
                  </small>
                </div>
              ))}
            </div>
          ) : <p className="ap-muted">Lesson progress will appear once instructors publish lessons for your courses.</p>}
        </section>

        <section className="ap-card">
          <div className="ap-card-heading">
            <h2>Upcoming assignments</h2>
            <Link href="/academy/assignments">All assignments</Link>
          </div>
          {upcomingAssignments.length ? (
            <ul className="ap-list">
              {upcomingAssignments.map((assignment) => (
                <li key={assignment.id} className="ap-list-row">
                  <div>
                    <strong>{assignment.title}</strong>
                    <p>{assignment.course_title || 'Course'} · Due {formatDate(assignment.due_at)}</p>
                  </div>
                  <span className="ap-chip ap-chip-pending">To do</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ap-muted">You’re all caught up on upcoming assignments.</p>
          )}
        </section>

        <section className="ap-card">
          <div className="ap-card-heading">
            <h2>Next exams</h2>
            <Link href="/academy/reports">All dates</Link>
          </div>
          {upcomingExams.length ? (
            <ul className="ap-list">
              {upcomingExams.map((exam) => (
                <li key={exam.id} className="ap-list-row">
                  <div>
                    <strong>{exam.title}</strong>
                    <p>{exam.course_title || 'Course'} · {formatDate(exam.date)}</p>
                  </div>
                  <span className="ap-chip ap-chip-neutral">{exam.start_time || 'Time TBA'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ap-muted">No upcoming exams have been scheduled.</p>
          )}
        </section>

        <section className="ap-card">
          <div className="ap-card-heading">
            <h2>My courses</h2>
            <Link href="/academy/courses">All courses</Link>
          </div>
          {enrollments.length ? (
            <ul className="ap-list">
              {enrollments.slice(0, 4).map((enrollment) => (
                <li key={enrollment.enrollment_id} className="ap-list-row">
                  <div>
                    <strong>{enrollment.course_title || 'Course'}</strong>
                    <p>{enrollment.session_name || 'Academy session'}</p>
                  </div>
                  <Link href={`/academy/courses/${encodeURIComponent(enrollment.course_id)}`} className="ap-link">
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ap-muted">No courses are linked to your account yet.</p>
          )}
        </section>

        <section className="ap-card">
          <div className="ap-card-heading">
            <h2>Recent notifications</h2>
            <Link href="/academy/notifications">View all</Link>
          </div>
          {(data.notifications || []).length ? (
            <ul className="ap-list">
              {data.notifications.slice(0, 3).map((notification) => (
                <li key={notification.id} className="ap-list-row ap-announcement">
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <small>{formatDate(notification.createdAt)}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ap-muted">There are no notifications right now.</p>
          )}
        </section>

        <section className="ap-card">
          <div className="ap-card-heading">
            <h2>Academy announcements</h2>
            <Link href="/academy/timetable">View schedule</Link>
          </div>
          {(data.announcements || []).slice(0, 3).length ? (
            <ul className="ap-list">
              {data.announcements.slice(0, 3).map((announcement) => (
                <li key={announcement.id} className="ap-list-row ap-announcement">
                  <div>
                    <strong>{announcement.title}</strong>
                    <p>{announcement.body}</p>
                    <small>{announcement.session_name || 'All students'} · {formatDate(announcement.created_at)}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="ap-muted">There are no announcements right now.</p>}
        </section>
      </div>
    </main>
  );
}
