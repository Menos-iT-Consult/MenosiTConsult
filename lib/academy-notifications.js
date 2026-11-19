const academy = require('../backend/academy-db');
const mailer = require('../backend/mailer');
const { sendAcademySms } = require('./academy-sms');

async function deliver(channel, student, notification, send, log) {
  let delivery;
  try {
    delivery = await send({
      to: student.email,
      phone: student.phone,
      subject: notification.subject,
      message: channel === 'email' ? notification.emailMessage : notification.smsMessage,
    });
  } catch (error) {
    delivery = { ok: false, error: error.message || String(error) };
  }

  const result = {
    sent: delivery?.ok === true,
    error: delivery?.ok === true ? '' : delivery?.error || 'The notification could not be sent.',
  };
  try {
    await log({
      studentId: student.id,
      channel,
      type: notification.type,
      status: result.sent ? 'sent' : 'failed',
      error: result.error || null,
      payload: notification.metadata || null,
    });
  } catch (error) {
    console.error(`Academy ${channel} notification log failed:`, error);
  }
  return result;
}

async function sendStudentNotification(
  student,
  {
    type,
    subject,
    message,
    emailMessage = message,
    smsMessage = message,
    metadata = null,
    channels = ['email', 'sms'],
  },
  { emailSender = mailer.sendAcademyNotificationEmail, smsSender = sendAcademySms, log = academy.logNotification } = {}
) {
  if (!student || !student.id || !type || !subject || !emailMessage || !smsMessage) {
    throw new Error('A student and complete email/SMS notification content are required.');
  }
  if (!Array.isArray(channels) || channels.some((channel) => !['email', 'sms'].includes(channel))) {
    throw new Error('Notification channels must be email and/or SMS.');
  }
  const notification = { type, subject, emailMessage, smsMessage, metadata };
  const result = {
    email: { sent: false, skipped: true, error: '' },
    sms: { sent: false, skipped: true, error: '' },
  };
  await Promise.all(channels.map(async (channel) => {
    result[channel] = await deliver(
      channel,
      student,
      notification,
      channel === 'email' ? emailSender : smsSender,
      log
    );
  }));
  return result;
}

async function sendStudentNotifications(students, notification) {
  const results = [];
  for (let index = 0; index < students.length; index += 5) {
    const batch = students.slice(index, index + 5);
    results.push(...await Promise.all(
      batch.map((student) => sendStudentNotification(student, notification))
    ));
  }
  return results;
}

function summarizeStudentNotifications(results) {
  return {
    recipients: results.length,
    emailSent: results.filter((result) => result.email.sent).length,
    smsSent: results.filter((result) => result.sms.sent).length,
    emailFailed: results.filter((result) => !result.email.sent).length,
    smsFailed: results.filter((result) => !result.sms.sent).length,
  };
}

module.exports = {
  sendStudentNotification,
  sendStudentNotifications,
  summarizeStudentNotifications,
};
