const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isStudentEligibleForCourse,
  getCurrentCourseSession,
} = require('../lib/academy-enrollment');

test('students can enroll only in published courses assigned to their program', () => {
  const student = { status: 'active', programId: 'program-1' };
  const course = { programId: 'program-1', published: true };

  assert.equal(isStudentEligibleForCourse(student, course), true);
  assert.equal(isStudentEligibleForCourse(student, { ...course, programId: 'program-2' }), false);
  assert.equal(isStudentEligibleForCourse(student, { ...course, published: false }), false);
  assert.equal(isStudentEligibleForCourse({ ...student, status: 'pending' }, course), false);
  assert.equal(isStudentEligibleForCourse({ ...student, programId: '' }, course), false);
});

test('student course enrollment requires a current academic session', () => {
  const current = { id: 'session-current', is_current: true };
  assert.equal(getCurrentCourseSession([current, { id: 'session-old', is_current: false }]), current);
  assert.equal(getCurrentCourseSession([{ id: 'session-old', is_current: false }]), null);
  assert.equal(getCurrentCourseSession(null), null);
});
