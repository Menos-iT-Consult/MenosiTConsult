const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTimetableEntry } = require('../lib/academy-timetable-validation');

test('timetable validation trims and returns a valid class schedule', () => {
  assert.deepEqual(validateTimetableEntry({
    sessionId: ' session-1 ',
    courseId: ' course-1 ',
    dayOfWeek: 'Tuesday',
    startTime: '09:15',
    endTime: '10:30',
    venue: ' Room 4 ',
  }), {
    entry: {
      sessionId: 'session-1',
      courseId: 'course-1',
      dayOfWeek: 'Tuesday',
      startTime: '09:15',
      endTime: '10:30',
      venue: 'Room 4',
    },
  });
});

test('timetable validation rejects missing selections, invalid days, and non-increasing times', () => {
  const validEntry = {
    sessionId: 'session-1',
    courseId: 'course-1',
    dayOfWeek: 'Tuesday',
    startTime: '09:15',
    endTime: '10:30',
  };

  assert.match(validateTimetableEntry({ ...validEntry, sessionId: '' }).error, /session and course/i);
  assert.match(validateTimetableEntry({ ...validEntry, dayOfWeek: 'Funday' }).error, /day/i);
  assert.match(validateTimetableEntry({ ...validEntry, endTime: '09:15' }).error, /class times/i);
});
