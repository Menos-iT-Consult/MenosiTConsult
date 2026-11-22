const academy = require('../backend/academy-db');
const mailer = require('../backend/mailer');
const { sendAcademySms } = require('./academy-sms');

function invitationSmsMessage(name, setupUrl) {
  const cleanName = String(name || 'Instructor').replace(/[\r\n]/g, ' ').trim();
  return `MITA Academy instructor setup for ${cleanName}: ${setupUrl} This single-use link expires in 7 days.`;
}

async function attemptDelivery(send) {
  try {
    const result = await send();
    return {
      sent: result?.ok === true,
      error: result?.ok === true ? '' : result?.error || 'The notification could not be sent.',
      campaignId: result?.campaignId || null,
    };
  } catch (error) {
    return { sent: false, error: error.message || String(error), campaignId: null };
  }
}

async function deliverInstructorInvitation(staff, setupUrl, {
  emailSender = mailer.sendInstructorInvitationEmail,
  smsSender = sendAcademySms,
  log = academy.logNotification,
} = {}) {
  const [email, sms] = await Promise.all([
    attemptDelivery(() => emailSender({
      to: staff.email,
      name: staff.name,
      setupUrl,
    })),
    staff.phone
      ? attemptDelivery(() => smsSender({
          phone: staff.phone,
          message: invitationSmsMessage(staff.name, setupUrl),
        }))
      : Promise.resolve({ sent: false, error: 'An instructor mobile number is required for SMS.', campaignId: null }),
  ]);

  for (const [channel, delivery] of [['email', email], ['sms', sms]]) {
    try {
      await log({
        studentId: null,
        channel,
        type: 'instructor_invitation',
        status: delivery.sent ? 'sent' : 'failed',
        error: delivery.error || null,
        payload: { staffId: staff.id, campaignId: delivery.campaignId },
      });
    } catch (error) {
      console.error(`Academy instructor invitation ${channel} log failed:`, error);
    }
  }
  return { email, sms };
}

module.exports = { invitationSmsMessage, deliverInstructorInvitation };
