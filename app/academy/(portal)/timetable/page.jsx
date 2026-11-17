'use client';

import useStudentPortalData from '../useStudentPortalData';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TimetablePage() {
  const { data, loading, error, reload } = useStudentPortalData();

  if (loading) return <main className="ap-main"><p>Loading timetable…</p></main>;
  if (error) {
    return (
      <main className="ap-main">
        <div className="ap-error" role="alert">{error}</div>
        <button className="ap-button" onClick={reload}>Try again</button>
      </main>
    );
  }

  const timetable = data.timetable || [];
  const announcements = data.announcements || [];
  return (
    <main className="ap-main">
      <header className="ap-page-head">
        <h1>Timetable & announcements</h1>
        <p>Your weekly class schedule and the latest academy updates.</p>
      </header>

      <section className="ap-section">
        <h2>Weekly timetable</h2>
        {timetable.length ? (
          <div className="ap-timetable">
            {DAYS.map((day) => {
              const classes = timetable.filter((entry) => entry.day_of_week?.toLowerCase() === day.toLowerCase());
              if (!classes.length) return null;
              return (
                <section className="ap-day" key={day}>
                  <h3>{day}</h3>
                  {classes.map((entry) => (
                    <article className="ap-day-entry" key={entry.id}>
                      <time>{entry.start_time} – {entry.end_time}</time>
                      <div>
                        <strong>{entry.course_title || 'Class'}</strong>
                        <p>{entry.session_name || 'Academy session'}{entry.venue ? ` · ${entry.venue}` : ''}</p>
                      </div>
                    </article>
                  ))}
                </section>
              );
            })}
            {timetable.some((entry) => !DAYS.some((day) => day.toLowerCase() === entry.day_of_week?.toLowerCase())) && (
              <section className="ap-day">
                <h3>Other schedule entries</h3>
                {timetable.filter((entry) => !DAYS.some((day) => day.toLowerCase() === entry.day_of_week?.toLowerCase())).map((entry) => (
                  <article className="ap-day-entry" key={entry.id}>
                    <time>{entry.day_of_week || 'Day TBA'} · {entry.start_time} – {entry.end_time}</time>
                    <div><strong>{entry.course_title || 'Class'}</strong><p>{entry.venue || 'Venue to be announced'}</p></div>
                  </article>
                ))}
              </section>
            )}
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>Your class schedule has not been published yet.</p></div>
        )}
      </section>

      <section className="ap-section">
        <h2>Academy announcements</h2>
        {announcements.length ? (
          <div className="ap-stack">
            {announcements.map((announcement) => (
              <article className="ap-card ap-announcement-card" key={announcement.id}>
                <div className="ap-card-heading">
                  <h3>{announcement.title}</h3>
                  <time className="ap-muted">{formatDate(announcement.created_at)}</time>
                </div>
                <p>{announcement.body}</p>
                <span className="ap-eyebrow">{announcement.session_name || 'All students'}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="ap-card ap-empty"><p>There are no announcements right now.</p></div>
        )}
      </section>
    </main>
  );
}
