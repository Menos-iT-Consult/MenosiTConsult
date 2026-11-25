const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAcademyContactMessage } = require('../lib/academy-contact-validation');
const mailer = require('../backend/mailer');

const validMessage = {
  name: 'Ama Mensah',
  email: 'ama@example.com',
  phone: '+233 54 000 0000',
  subject: 'Course enquiry',
  message: 'Please share more details about the next intake.',
};

test('Academy contact messages validate and normalize entered text', () => {
  assert.deepEqual(validateAcademyContactMessage({ ...validMessage, name: ' Ama Mensah ' }), {
    message: { ...validMessage, name: 'Ama Mensah' },
  });
});

test('Academy contact messages reject invalid email, oversized content, and honeypot submissions', () => {
  assert.match(validateAcademyContactMessage({ ...validMessage, email: 'invalid' }).error, /valid email/);
  assert.match(validateAcademyContactMessage({ ...validMessage, message: 'short' }).error, /between 10/);
  assert.match(validateAcademyContactMessage({ ...validMessage, company: 'spam' }).error, /Unable to process/);
});

test('Academy contact messages set the sender as the reply-to address', async () => {
  let sentMessage;
  const result = await mailer.sendAcademyNotificationEmail({
    to: 'academy@example.com',
    replyTo: validMessage.email,
    subject: 'Academy contact: Course enquiry',
    message: validMessage.message,
    transporter: {
      sendMail: async (message) => { sentMessage = message; },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(sentMessage.replyTo, validMessage.email);
});
