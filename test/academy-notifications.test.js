const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sendStudentNotification,
  summarizeStudentNotifications,
} = require('../lib/academy-notifications');
const { sendAcademyNotificationEmail } = require('../backend/mailer');

test('attempts and logs both channels when one notification provider fails', async () => {
  const logEntries = [];
  const student = { id: 'student-1', email: 'learner@example.test', phone: '0241234567' };
  const result = await sendStudentNotification(student, {
    type: 'test_event',
    subject: 'Test',
    message: 'A short Academy notification.',
  }, {
    emailSender: async ({ to, subject, message }) => {
      assert.equal(to, student.email);
      assert.equal(subject, 'Test');
      assert.equal(message, 'A short Academy notification.');
      return { ok: true };
    },
    smsSender: async () => { throw new Error('SMS provider unavailable.'); },
    log: async (entry) => logEntries.push(entry),
  });

  assert.deepEqual(result, {
    email: { sent: true, error: '' },
    sms: { sent: false, error: 'SMS provider unavailable.' },
  });
  assert.deepEqual(logEntries.map(({ channel, status }) => ({ channel, status }))
    .sort((left, right) => left.channel.localeCompare(right.channel)), [
    { channel: 'email', status: 'sent' },
    { channel: 'sms', status: 'failed' },
  ]);
});

test('sends Academy notifications through the Academy SMTP transport', async () => {
  let message;
  const result = await sendAcademyNotificationEmail({
    to: 'learner@example.test',
    subject: 'Academy update',
    message: 'Your class schedule changed.',
    transporter: {
      sendMail: async (outgoing) => { message = outgoing; },
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(message.to, 'learner@example.test');
  assert.equal(message.subject, 'Academy update');
  assert.equal(message.text, 'Your class schedule changed.');
});

test('can retry one failed channel without resending the successful channel', async () => {
  const logged = [];
  const result = await sendStudentNotification({
    id: 'student-1',
    email: 'learner@example.test',
    phone: '0241234567',
  }, {
    type: 'invoice_overdue',
    subject: 'Invoice reminder',
    message: 'Your invoice is overdue.',
    metadata: { eventId: 'invoice-1:2026-03-01' },
    channels: ['sms'],
  }, {
    emailSender: async () => {
      assert.fail('The successful email channel must not be retried.');
    },
    smsSender: async () => ({ ok: true }),
    log: async (entry) => logged.push(entry),
  });

  assert.equal(result.email.skipped, true);
  assert.equal(result.sms.sent, true);
  assert.equal(logged.length, 1);
  assert.equal(logged[0].channel, 'sms');
  assert.deepEqual(logged[0].payload, { eventId: 'invoice-1:2026-03-01' });
});

test('summarizes failed delivery channels explicitly', () => {
  assert.deepEqual(summarizeStudentNotifications([{
    email: { sent: true },
    sms: { sent: false },
  }]), {
    recipients: 1,
    emailSent: 1,
    smsSent: 0,
    emailFailed: 0,
    smsFailed: 1,
  });
});
