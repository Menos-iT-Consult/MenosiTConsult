'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useStudentPortalData from '../../useStudentPortalData';

function safeResourceUrl(value) {
  return typeof value === 'string' && (/^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value));
}

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const { data, loading, error, reload } = useStudentPortalData();

  if (loading) return <main className="ap-main"><p>Loading course details…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const courses = (data.enrollments || []).filter((enrollment) => enrollment.course_id === courseId);
  const programCourse = (data.programCourses || []).find((item) => item.id === courseId);
  if (!courses.length && !programCourse) {
    return (
      <main className="ap-main">
        <div className="ap-card ap-empty">
          <h1>Course not found</h1>
          <p>This course is not part of your current enrollments.</p>
          <Link className="ap-button" href="/academy/courses">Back to courses</Link>
        </div>
      </main>
    );
  }

  if (!courses.length) {
    return (
    <main className="ap-main">
      <Link href="/academy/courses" className="ap-back-link">← All courses</Link>
      <header className="ap-page-head">
        <span className="ap-eyebrow">{programCourse.code || 'Course'} · Program course</span>
        <h1>{programCourse.title}</h1>
        <p>{programCourse.description || 'This course is assigned to your academic program.'}</p>
      </header>
      <div className="ap-course-meta ap-course-meta-large">
        <span>{programCourse.creditHours} credit hours</span>
        <span>Semester {programCourse.semesterNumber}</span>
        {programCourse.instructorName && <span>Instructor: {programCourse.instructorName}</span>}
      </div>
      <div className="ap-card ap-empty">
        <p>This course is part of your program. Class materials, assignments, and results will appear here when you are enrolled in a course session.</p>
      </div>
    </main>
    );
  }

  const course = courses[0];
  const assignments = (data.assignments || []).filter(
    (assignment) => assignment.course_id === courseId &&
      courses.some((enrollment) => enrollment.session_id === assignment.session_id)
  );
  const exams = (data.exams || []).filter(
    (exam) => exam.course_id === courseId &&
      courses.some((enrollment) => enrollment.session_id === exam.session_id)
  );
  const timetable = (data.timetable || []).filter(
    (entry) => entry.course_id === courseId &&
      courses.some((enrollment) => enrollment.session_id === entry.session_id)
  );

  return (
    <main className="ap-main">
      <Link href="/academy/courses" className="ap-back-link">← All courses</Link>
      <header className="ap-page-head">
        <span className="ap-eyebrow">{course.course_code || 'Course'} · {course.session_name}</span>
        <h1>{course.course_title || 'Course details'}</h1>
        <p>{course.course_description || 'Course information and resources from your instructor.'}</p>
      </header>

      <div className="ap-course-meta ap-course-meta-large">
        <span>{course.credit_hours || 0} credit hours</span>
        <span>Semester {course.semester_number || 1}</span>
        {course.total !== null && course.total !== undefined && (
          <span>Current grade: {course.letter || course.total} ({course.total})</span>
        )}
      </div>

      <section className="ap-section">
        <div className="ap-card-heading"><h2>Course materials & assignments</h2></div>
        {assignments.length ? (
          <div className="ap-stack">
            {assignments.map((assignment) => (
              <article className="ap-card ap-work-card" key={assignment.id}>
                <h3>{assignment.title}</h3>
                {assignment.instructions && <p className="ap-work-description">{assignment.instructions}</p>}
                <p className="ap-muted">
                  Due {assignment.due_at ? new Date(assignment.due_at).toLocaleString() : 'date to be announced'}
                </p>
                {safeResourceUrl(assignment.attachment) && (
                  <a className="ap-resource-link" href={assignment.attachment} target="_blank" rel="noreferrer">
                    Open learning material
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>No learning materials or assignments have been added to this course.</p></div>
        )}
      </section>

      <section className="ap-section">
        <h2>Upcoming exams</h2>
        {exams.length ? exams.map((exam) => (
          <article className="ap-card ap-list-row" key={exam.id}>
            <div>
              <strong>{exam.title}</strong>
              <p>{exam.date || 'Date TBA'} · {exam.start_time || 'Time TBA'}{exam.venue ? ` · ${exam.venue}` : ''}</p>
            </div>
          </article>
        )) : <div className="ap-card ap-empty"><p>No exams scheduled.</p></div>}
      </section>

      <section className="ap-section">
        <h2>Class schedule</h2>
        {timetable.length ? (
          <div className="ap-card">
            {timetable.map((entry) => (
              <p className="ap-timetable-line" key={entry.id}>
                <strong>{entry.day_of_week}</strong> · {entry.start_time} – {entry.end_time}
                {entry.venue ? ` · ${entry.venue}` : ''}
              </p>
            ))}
          </div>
        ) : <div className="ap-card ap-empty"><p>No class times scheduled.</p></div>}
      </section>
    </main>
  );
}
