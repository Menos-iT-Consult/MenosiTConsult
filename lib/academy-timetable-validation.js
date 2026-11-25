const DAYS_OF_WEEK = Object.freeze([
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]);

function toMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function validateTimetableEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'Timetable details are required.' };
  }

  const entry = {
    sessionId: typeof value.sessionId === 'string' ? value.sessionId.trim() : '',
    courseId: typeof value.courseId === 'string' ? value.courseId.trim() : '',
    dayOfWeek: typeof value.dayOfWeek === 'string' ? value.dayOfWeek.trim() : '',
    startTime: typeof value.startTime === 'string' ? value.startTime.trim() : '',
    endTime: typeof value.endTime === 'string' ? value.endTime.trim() : '',
    venue: typeof value.venue === 'string' ? value.venue.trim() : '',
  };

  if (!entry.sessionId || entry.sessionId.length > 120 || !entry.courseId || entry.courseId.length > 120) {
    return { error: 'Choose an academic session and course.' };
  }
  if (!DAYS_OF_WEEK.includes(entry.dayOfWeek)) {
    return { error: 'Choose a valid day of the week.' };
  }

  const start = toMinutes(entry.startTime);
  const end = toMinutes(entry.endTime);
  if (start === null || end === null || end <= start) {
    return { error: 'Enter valid class times with the end time after the start time.' };
  }
  if (entry.venue.length > 200) {
    return { error: 'Venue must be 200 characters or fewer.' };
  }

  return { entry };
}

module.exports = { DAYS_OF_WEEK, validateTimetableEntry };
