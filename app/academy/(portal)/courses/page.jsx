'use client';

import Link from 'next/link';
import useStudentPortalData from '../useStudentPortalData';

export default function CoursesPage() {
  const { data, loading, error, reload } = useStudentPortalData();

  if (loading) return <main className="ap-main"><p>Loading your courses…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const enrollments = data.enrollments || [];
  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>My courses</h1>
        <p>Course information, learning materials, assignments, and results.</p>
      </header>

      {enrollments.length ? (
        <div className="ap-grid-2">
          {enrollments.map((enrollment) => {
            const courseAssignments = (data.assignments || []).filter(
              (assignment) => assignment.course_id === enrollment.course_id &&
                assignment.session_id === enrollment.session_id
            );
            const resources = courseAssignments.filter((assignment) => assignment.attachment);
            return (
              <article className="ap-card ap-course-card" key={enrollment.enrollment_id}>
                <div className="ap-course-title">
                  <div>
                    <span className="ap-eyebrow">{enrollment.course_code || 'Course'}</span>
                    <h2>{enrollment.course_title || 'Course details'}</h2>
                  </div>
                  {enrollment.is_current && <span className="ap-chip ap-chip-active">Current</span>}
                </div>
                <p className="ap-card-sub">{enrollment.session_name || 'Academy session'}</p>
                <p className="ap-course-description">
                  {enrollment.course_description || 'Course overview and learning materials will appear here.'}
                </p>
                <div className="ap-course-meta">
                  <span>{enrollment.credit_hours || 0} credit hours</span>
                  <span>Semester {enrollment.semester_number || 1}</span>
                </div>
                <div className="ap-course-actions">
                  <Link
                    className="ap-button"
                    href={`/academy/courses/${encodeURIComponent(enrollment.course_id)}`}
                  >
                    Open course
                  </Link>
                  {resources.length > 0 && (
                    <span className="ap-muted">{resources.length} learning resource{resources.length === 1 ? '' : 's'}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ap-card ap-empty">
          <div className="ap-empty-icon" aria-hidden="true">📚</div>
          <h2>No courses yet</h2>
          <p>When the academy enrolls you in courses, they’ll appear here.</p>
        </div>
      )}
    </main>
  );
}
