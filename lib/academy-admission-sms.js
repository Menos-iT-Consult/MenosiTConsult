const { buildAdmissionSms } = require('./academy-sms');
const { sendStudentNotification } = require('./academy-notifications');

async function sendAndLogAdmissionNotification(student, portalUrl) {
  const name = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const message = buildAdmissionSms({
    firstName: student.firstName,
    studentId: student.studentId,
    portalUrl,
  });
  return sendStudentNotification(student, {
    type: 'admission_approved',
    subject: 'Your MITA Academy admission is approved',
    emailMessage: `Hello ${name},\n\nYour admission to MITA Academy is approved.\n\nStudent ID: ${student.studentId}\nTemporary password: ${student.studentId}\n\nSign in at ${portalUrl} and change your password on first login.`,
    smsMessage: message,
  });
}

async function sendAndLogAdmissionSms(student, portalUrl) {
  return (await sendAndLogAdmissionNotification(student, portalUrl)).sms;
}

module.exports = { sendAndLogAdmissionNotification, sendAndLogAdmissionSms };
