'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dashboardModel from './dashboard-model';

const { buildInstructorDashboardModel, courseToolHref, TEACHING_TOOLS } = dashboardModel;

function formatShortDate(value) {
  if (!value) return 'Recently submitted';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Recently submitted'
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDeadline(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '—', month: '' };
  return {
    day: date.toLocaleDateString(undefined, { day: '2-digit' }),
    month: date.toLocaleDateString(undefined, { month: 'short' }),
  };
}

const PAGE_HEADERS = {
  overview: {
    title: (staff) => staff ? `Welcome back, ${staff.name}` : 'Your teaching overview',
    description: 'See your teaching activity and open a workspace.',
  },
  tools: {
    title: () => 'Teaching tools',
    description: 'Choose a course to create assignments, quizzes, lessons, or manage grades and attendance.',
  },
  review: {
    title: () => 'Submissions to review',
    description: 'Review and grade student work across your assigned courses.',
  },
  courses: {
    title: () => 'My courses',
    description: 'Open a course workspace to manage its students and learning activities.',
  },
  deadlines: {
    title: () => 'Upcoming deadlines',
    description: 'See assignment deadlines across your assigned courses.',
  },
};

function DashboardHeader({ staff, loading, onRefresh, section }) {
  const header = PAGE_HEADERS[section] || PAGE_HEADERS.overview;
  return (
    <header className="ap-instructor-header">
      <div>
        <p className="ap-eyebrow">MITA Academy · Instructor workspace</p>
        <h1>{header.title(staff)}</h1>
        <p>{header.description}</p>
      </div>
      <button
        className="ap-button ap-instructor-refresh"
        type="button"
        onClick={onRefresh}
        disabled={loading}
      >
        <span aria-hidden="true">↻</span>
        {loading ? 'Updating…' : 'Refresh'}
      </button>
    </header>
  );
}

function SummaryCard({ label, value, note, icon, tone }) {
  return (
    <article className="ap-card ap-instructor-summary-card">
      <span className={`ap-instructor-summary-icon ${tone}`} aria-hidden="true">{icon}</span>
      <div className="ap-instructor-summary-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function TeachingTools({ courses, selectedCourseId, onCourseChange }) {
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  return (
    <section className="ap-card ap-instructor-panel" id="teaching-tools">
      <div className="ap-instructor-panel-heading">
        <div>
          <p className="ap-eyebrow">Shortcuts</p>
          <h2>Teaching tools</h2>
        </div>
        {courses.length > 0 && (
          <label className="ap-instructor-course-picker">
            <span>Course</span>
            <select
              className="ap-select"
              value={selectedCourseId}
              onChange={(event) => onCourseChange(event.target.value)}
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
        {TEACHING_TOOLS.map((tool) => {
          const className = `ap-instructor-tool${selectedCourse ? '' : ' is-disabled'}`;
          const content = (
            <>
              <span className="ap-instructor-tool-icon" aria-hidden="true">{tool.icon}</span>
              <span className="ap-instructor-tool-copy">
                <strong>{tool.title}</strong>
                <small>{tool.description}</small>
              </span>
              <span className="ap-instructor-tool-arrow" aria-hidden="true">→</span>
            </>
          );
          return selectedCourse ? (
            <Link
              className={className}
              href={courseToolHref(selectedCourse.id, tool.key)}
              key={`${tool.key}-${tool.title}`}
              aria-label={`${tool.title} for ${selectedCourse.title}`}
            >
              {content}
            </Link>
          ) : (
            <div className={className} key={`${tool.key}-${tool.title}`} aria-disabled="true">
              {content}
            </div>
          );
        })}
      </div>
      {!courses.length && (
        <p className="ap-instructor-tools-note">Course tools will be available when an administrator assigns you a course.</p>
      )}
    </section>
  );
}

function ReviewQueue({ model, courses }) {
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (
    <section className="ap-card ap-instructor-panel" id="needs-review">
      <div className="ap-instructor-panel-heading">
        <div>
          <p className="ap-eyebrow">Student work</p>
          <h2>Needs your review</h2>
        </div>
        <span className={`ap-instructor-badge${model.pendingSubmissions.length ? ' is-pending' : ''}`}>
          {model.pendingSubmissions.length} pending
        </span>
      </div>

      {model.pendingSubmissions.length ? (
        <div className="ap-instructor-review-list">
          {model.pendingSubmissions.map((submission) => {
            const course = courseById.get(submission.courseId);
            return (
              <article className="ap-instructor-review-row" key={submission.id}>
                <span className="ap-instructor-review-avatar" aria-hidden="true">
                  {(submission.studentName || 'S').trim().charAt(0).toUpperCase()}
                </span>
                <div className="ap-instructor-review-copy">
                  <strong>{submission.studentName || 'Student'}</strong>
                  <p>{submission.assignmentTitle || 'Assignment'} · {course?.title || 'Assigned course'}</p>
                </div>
                <time dateTime={submission.submittedAt || undefined}>
                  {formatShortDate(submission.submittedAt)}
                </time>
                <Link
                  className="ap-instructor-row-action"
                  href={course ? courseToolHref(course.id, 'assignments') : '/instructor/dashboard#my-courses'}
                  aria-label={`Review ${submission.assignmentTitle || 'assignment'} from ${submission.studentName || 'student'}`}
                >
                  Review <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ap-instructor-empty-state">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>All caught up</strong>
            <p>No submissions are waiting for review.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function UpcomingDeadlines({ assignments, courses }) {
  const courseById = new Map(courses.map((course) => [course.id, course]));

  return (
    <section className="ap-card ap-instructor-panel" id="upcoming-deadlines">
      <div className="ap-instructor-panel-heading">
        <div>
          <p className="ap-eyebrow">Plan ahead</p>
          <h2>Upcoming deadlines</h2>
        </div>
        <span className="ap-instructor-panel-count">{assignments.length}</span>
      </div>
      {assignments.length ? (
        <div className="ap-instructor-deadline-list">
          {assignments.map((assignment) => {
            const date = formatDeadline(assignment.dueAt);
            const course = courseById.get(assignment.courseId);
            return (
              <article className="ap-instructor-deadline-row" key={assignment.id}>
                <time className="ap-instructor-deadline-date" dateTime={assignment.dueAt}>
                  <strong>{date.day}</strong>
                  <small>{date.month}</small>
                </time>
                <div className="ap-instructor-deadline-copy">
                  <strong>{assignment.title}</strong>
                  <p>{course?.title || 'Assigned course'}</p>
                </div>
                <Link
                  className="ap-instructor-row-action"
                  href={course ? courseToolHref(course.id, 'assignments') : '/instructor/dashboard#my-courses'}
                  aria-label={`Open ${assignment.title} in its course`}
                >
                  Open <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ap-instructor-empty-state">
          <span aria-hidden="true">⌁</span>
          <div>
            <strong>Nothing due soon</strong>
            <p>Your upcoming assignment deadlines will appear here.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function CourseOverview({ courses, model }) {
  return (
    <section className="ap-section" id="my-courses">
      <div className="ap-instructor-section-heading">
        <div>
          <p className="ap-eyebrow">Your classroom</p>
          <h2>My courses</h2>
        </div>
        <span className="ap-instructor-section-count">{courses.length} assigned</span>
      </div>
      {courses.length ? (
        <div className="ap-instructor-course-grid">
          {courses.map((course) => {
            const progress = model.progressByCourse.get(course.id);
            return (
              <article className="ap-card ap-instructor-course-card" key={course.id}>
                <div className="ap-instructor-course-card-heading">
                  <span className="ap-instructor-course-mark" aria-hidden="true">
                    {(course.code || course.title || 'C').trim().charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="ap-eyebrow">{course.code || 'Course'}</p>
                    <h3>{course.title}</h3>
                  </div>
                </div>
                <p className="ap-instructor-course-description">
                  {course.description || 'Open your course workspace to manage class activities.'}
                </p>
                <div className="ap-instructor-course-stats">
                  <span><strong>{Number(progress?.rosterCount) || 0}</strong> students</span>
                  <span><strong>{Number(progress?.ungradedSubmissionCount) || 0}</strong> to review</span>
                  <span><strong>{Number(progress?.missingSubmissionCount) || 0}</strong> missing</span>
                </div>
                <Link
                  className="ap-button ap-button-primary"
                  href={`/instructor/courses/${encodeURIComponent(course.id)}`}
                >
                  Open course workspace
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ap-card ap-instructor-empty-courses">
          <span aria-hidden="true">＋</span>
          <div>
            <h3>No courses assigned yet</h3>
            <p>Contact an Academy administrator to have courses assigned to your account.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardLoading() {
  return (
    <div className="ap-instructor-loading" role="status" aria-label="Loading instructor dashboard">
      <span />
      <span />
      <span />
    </div>
  );
}

function DashboardNavigation() {
  const destinations = [
    { href: '/instructor/teaching-tools', title: 'Teaching tools', text: 'Create course activities and manage class sessions.', icon: 'T' },
    { href: '/instructor/review', title: 'Needs review', text: 'Grade student submissions and leave feedback.', icon: 'R' },
    { href: '/instructor/courses', title: 'My courses', text: 'Open your assigned course workspaces.', icon: 'C' },
    { href: '/instructor/deadlines', title: 'Deadlines', text: 'Plan around upcoming assignment due dates.', icon: 'D' },
  ];

  return (
    <nav className="ap-instructor-nav-grid" aria-label="Instructor workspaces">
      {destinations.map((destination) => (
        <Link className="ap-card ap-instructor-nav-card" href={destination.href} key={destination.href}>
          <span aria-hidden="true">{destination.icon}</span>
          <div>
            <strong>{destination.title}</strong>
            <small>{destination.text}</small>
          </div>
          <span className="ap-instructor-tool-arrow" aria-hidden="true">→</span>
        </Link>
      ))}
    </nav>
  );
}

export default function InstructorDashboardView({ dashboard, loading, error, onRefresh, section = 'overview' }) {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const model = useMemo(
    () => dashboard ? buildInstructorDashboardModel(dashboard) : null,
    [dashboard]
  );
  const courses = dashboard?.courses || [];
  const courseCount = courses.length;

  useEffect(() => {
    if (!courses.some((course) => course.id === selectedCourseId)) {
      setSelectedCourseId(courses[0]?.id || '');
    }
  }, [courses, selectedCourseId]);

  return (
    <main className="ap-main ap-instructor-dashboard">
      <DashboardHeader
        staff={dashboard?.staff}
        loading={loading}
        onRefresh={onRefresh}
        section={section}
      />

      {error && (
        <div className="ap-error ap-instructor-error" role="alert">
          <span>{error}</span>
          <button className="ap-link-button" type="button" onClick={onRefresh} disabled={loading}>
            Try again
          </button>
        </div>
      )}

      {!dashboard ? loading ? <DashboardLoading /> : null : (
        <>
          {section === 'overview' && (
            <>
              <section className="ap-instructor-summary-grid" aria-label="Teaching overview">
                <SummaryCard
                  label="Assigned courses"
                  value={courseCount}
                  note="In your teaching workspace"
                  icon="C"
                  tone="is-blue"
                />
                <SummaryCard
                  label="Enrolled students"
                  value={model.enrollmentCount}
                  note="Across all assigned courses"
                  icon="S"
                  tone="is-teal"
                />
                <SummaryCard
                  label="To review"
                  value={model.pendingSubmissions.length}
                  note="Student submissions"
                  icon="R"
                  tone="is-amber"
                />
                <SummaryCard
                  label="Due this week"
                  value={model.dueThisWeekCount}
                  note="Assignment deadlines"
                  icon="D"
                  tone="is-violet"
                />
              </section>
              <DashboardNavigation />
            </>
          )}

          {section === 'tools' && (
            <TeachingTools
              courses={courses}
              selectedCourseId={selectedCourseId}
              onCourseChange={setSelectedCourseId}
            />
          )}
          {section === 'review' && <ReviewQueue model={model} courses={courses} />}
          {section === 'deadlines' && (
            <UpcomingDeadlines assignments={model.allUpcomingAssignments} courses={courses} />
          )}
          {section === 'courses' && <CourseOverview courses={courses} model={model} />}

          {section === 'overview' && (
            <aside className="ap-card ap-instructor-pulse" id="course-progress">
              <p className="ap-eyebrow">Classroom pulse</p>
              <h2>At a glance</h2>
              <p className="ap-instructor-pulse-intro">
                A quick read on activity across your assigned courses.
              </p>
              {dashboard.progress.length ? (
                <div className="ap-instructor-pulse-list">
                  {dashboard.progress.map((course) => (
                    <article key={course.courseId}>
                      <div>
                        <strong>{course.courseTitle}</strong>
                        <span>{Number(course.rosterCount) || 0} enrolled</span>
                      </div>
                      <span className="ap-instructor-pulse-review">
                        {Number(course.ungradedSubmissionCount) || 0} to review
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="ap-instructor-pulse-empty">
                  Assign a course to see its enrollment and review activity here.
                </div>
              )}
              <Link className="ap-link" href="/instructor/courses">View my courses <span aria-hidden="true">→</span></Link>
            </aside>
          )}
        </>
      )}
    </main>
  );
}
