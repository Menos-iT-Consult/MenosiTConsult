const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildInstructorDashboardModel,
  courseToolHref,
} = require('../app/instructor/dashboard/dashboard-model');

test('instructor dashboard groups pending work, upcoming deadlines, and course enrollment totals', () => {
  const now = new Date('2026-11-22T12:00:00.000Z').getTime();
  const model = buildInstructorDashboardModel({
    courses: [{ id: 'course-a' }, { id: 'course-b' }],
    assignments: [
      { id: 'later', dueAt: '2026-11-27T12:00:00.000Z' },
      { id: 'past', dueAt: '2026-11-21T12:00:00.000Z' },
      { id: 'soon', dueAt: '2026-11-23T12:00:00.000Z' },
      { id: 'no-date', dueAt: null },
      { id: 'invalid', dueAt: 'not-a-date' },
    ],
    submissions: [
      { id: 'pending-a', score: null },
      { id: 'graded', score: 75 },
      { id: 'pending-b', score: null },
    ],
    progress: [
      { courseId: 'course-a', rosterCount: 18 },
      { courseId: 'course-b', rosterCount: 12 },
    ],
  }, now);

  assert.deepEqual(model.reviewQueue.map(({ id }) => id), ['pending-a', 'pending-b']);
  assert.deepEqual(model.upcomingAssignments.map(({ id }) => id), ['soon', 'later']);
  assert.equal(model.dueThisWeekCount, 2);
  assert.equal(model.pendingSubmissions.length, 2);
  assert.equal(model.enrollmentCount, 30);
  assert.equal(model.progressByCourse.get('course-a').rosterCount, 18);
});

test('instructor course tool links encode course and tool IDs', () => {
  assert.equal(
    courseToolHref('course/a', 'lessons & content'),
    '/instructor/courses/course%2Fa?tool=lessons%20%26%20content'
  );
});
