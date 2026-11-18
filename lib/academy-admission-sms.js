const academy = require('../backend/academy-db');
const { sendAdmissionSms } = require('./academy-sms');

async function sendAndLogAdmissionSms(student, portalUrl) {
  let delivery;
  try {
    delivery = await sendAdmissionSms({ student, portalUrl });
  } catch (error) {
    console.error('Academy admission SMS request failed:', error.message);
    delivery = { ok: false, error: 'Could not connect to mNotify to send the admission SMS.' };
  }

  await academy.logNotification({
    studentId: student.id,
    channel: 'sms',
    type: 'admission_approved',
    status: delivery.ok ? 'sent' : 'failed',
    error: delivery.ok ? null : delivery.error,
    payload: delivery.campaignId ? { campaignId: delivery.campaignId } : null,
  });
  return delivery;
}

module.exports = { sendAndLogAdmissionSms };
