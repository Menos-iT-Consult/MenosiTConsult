'use client';

import useStudentPortalData from '../useStudentPortalData';

function formatDate(value) {
  if (!value) return 'Date to be announced';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? 'Date to be announced'
    : date.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatScore(value) {
  if (value == null || value === '') return '—';
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(1) : '—';
}

export default function StudentReportsPage() {
  const { data, loading, error, reload } = useStudentPortalData();

  if (loading) return <main className="ap-main"><p>Loading your academic reports…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" type="button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const enrollments = data.enrollments || [];
  const exams = data.exams || [];
  const quizResults = data.quizResults || [];
  const publishedGrades = enrollments.filter((enrollment) => enrollment.total != null);

  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Grades and exams</h1>
        <p>Review released course grades and exam schedules for your enrolled courses.</p>
      </header>

      <section className="ap-section">
        <div className="ap-card-heading">
          <h2>Grade report</h2>
          <span className="ap-muted">{publishedGrades.length} of {enrollments.length} grades released</span>
        </div>
        {enrollments.length ? (
          <div className="ap-table-wrap ap-card">
            <table className="ap-table">
              <thead>
                <tr>
                  <th scope="col">Course</th>
                  <th scope="col">Session</th>
                  <th scope="col">CA</th>
                  <th scope="col">Exam</th>
                  <th scope="col">Total</th>
                  <th scope="col">Grade</th>
                  <th scope="col">Points</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => {
                  const released = enrollment.total != null;
                  return (
                    <tr key={enrollment.enrollment_id}>
                      <td>{enrollment.course_title || 'Course'}</td>
                      <td>{enrollment.session_name || 'Academy session'}</td>
                      <td>{released ? formatScore(enrollment.ca) : 'Not released'}</td>
                      <td>{released ? formatScore(enrollment.exam) : 'Not released'}</td>
                      <td>{released ? formatScore(enrollment.total) : 'Not released'}</td>
                      <td>{released ? enrollment.letter || '—' : '—'}</td>
                      <td>{released ? formatScore(enrollment.points) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>You are not enrolled in any courses yet.</p></div>
        )}
        {enrollments.length > 0 && publishedGrades.length === 0 && (
          <p className="ap-muted ap-section">Grades will appear here after they are released by your instructors.</p>
        )}
      </section>

      <section className="ap-section">
        <div className="ap-card-heading">
          <h2>Quiz results</h2>
          <span className="ap-muted">{quizResults.length} completed</span>
        </div>
        {quizResults.length ? (
          <div className="ap-table-wrap ap-card">
            <table className="ap-table">
              <thead>
                <tr>
                  <th scope="col">Quiz</th>
                  <th scope="col">Course</th>
                  <th scope="col">Attempt</th>
                  <th scope="col">Score</th>
                  <th scope="col">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {quizResults.map((result) => (
                  <tr key={result.id}>
                    <td>{result.title}</td>
                    <td>{result.courseCode ? `${result.courseCode} · ` : ''}{result.courseTitle}</td>
                    <td>{result.attemptNumber}</td>
                    <td>{result.score}% ({result.correctCount} correct)</td>
                    <td>{new Date(result.submittedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="ap-card ap-empty"><p>Your submitted quiz results will appear here.</p></div>}
      </section>

      <section className="ap-section">
        <div className="ap-card-heading">
          <h2>Exam schedule</h2>
          <span className="ap-muted">{exams.length} scheduled</span>
        </div>
        {exams.length ? (
          <div className="ap-table-wrap ap-card">
            <table className="ap-table">
              <thead>
                <tr>
                  <th scope="col">Exam</th>
                  <th scope="col">Course</th>
                  <th scope="col">Session</th>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Venue</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td>{exam.title || 'Exam'}</td>
                    <td>{exam.course_title || 'Course'}</td>
                    <td>{exam.session_name || 'Academy session'}</td>
                    <td>{formatDate(exam.date)}</td>
                    <td>{exam.start_time || 'TBA'}{exam.end_time ? `–${exam.end_time}` : ''}</td>
                    <td>{exam.venue || 'TBA'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>No exams have been scheduled for your enrolled courses.</p></div>
        )}
      </section>
    </main>
  );
}
