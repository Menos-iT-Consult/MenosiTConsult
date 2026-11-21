const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSupportTicketInput,
  normalizeSupportMessage,
  normalizePaymentSubmissionInput,
  courseLessonProgress,
  getNextClass,
} = require('../lib/academy-portal');

test('support ticket input is trimmed and bounded', () => {
  assert.deepEqual(
    normalizeSupportTicketInput({ subject: '  Portal access ', message: '  I cannot sign in.  ' }),
    { subject: 'Portal access', message: 'I cannot sign in.' }
  );
  assert.equal(normalizeSupportTicketInput({ subject: 'Help', message: 'Short' }), null);
  assert.equal(normalizeSupportMessage({ message: ' ok ' }), 'ok');
  assert.equal(normalizeSupportMessage({ message: ' ' }), '');
});

test('payment reference input only accepts supported methods and valid references', () => {
  assert.deepEqual(
    normalizePaymentSubmissionInput({
      invoiceId: ' invoice-1 ',
      method: 'Mobile Money',
      reference: ' TXN-1234 ',
      note: '  Paid this morning ',
    }),
    { invoiceId: 'invoice-1', method: 'Mobile Money', reference: 'TXN-1234', note: 'Paid this morning' }
  );
  assert.equal(
    normalizePaymentSubmissionInput({ invoiceId: 'invoice-1', method: 'Card', reference: '1234' }),
    null
  );
});

test('course progress tracks completed lessons and the next incomplete lesson', () => {
  const lessons = [
    { id: 'one', courseId: 'course-a', courseTitle: 'Course A', completed: true },
    { id: 'two', courseId: 'course-a', courseTitle: 'Course A', completed: false },
  ];
  assert.deepEqual(courseLessonProgress(lessons), [{
    courseId: 'course-a',
    courseTitle: 'Course A',
    total: 2,
    completed: 1,
    nextLesson: lessons[1],
    percentage: 50,
  }]);
});

test('next class skips elapsed classes and chooses the closest upcoming one', () => {
  const now = new Date(2026, 10, 23, 12, 0);
  const next = getNextClass([
    { day_of_week: 'Monday', start_time: '09:00', course_title: 'Past class' },
    { day_of_week: 'Tuesday', start_time: '10:30', course_title: 'Next class' },
    { day_of_week: 'Friday', start_time: '08:00', course_title: 'Later class' },
  ], now);
  assert.equal(next.course_title, 'Next class');
  assert.equal(next.dayLabel, 'Tomorrow');
});
