import { NextResponse } from 'next/server';
const crypto = require('node:crypto');
const academy = require('../../../../../backend/academy-db');
const { sendStudentNotification } = require('../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') || '';
  if (!secret) return null;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

async function sendReminder(candidate, type, subject, emailMessage, smsMessage) {
  const previous = await academy.getNotificationStatuses(
    candidate.student.id,
    type,
    candidate.eventId
  );
  const channels = ['email', 'sms'].filter((channel) =>
    !previous.some((entry) => entry.channel === channel && entry.status === 'sent')
  );
  if (!channels.length) return null;
  return sendStudentNotification(candidate.student, {
    type,
    subject,
    emailMessage,
    smsMessage,
    metadata: { eventId: candidate.eventId },
    channels,
  });
}

export async function GET(request) {
  const authorized = isAuthorized(request);
  if (authorized === null) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }
  if (!authorized) return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });

  try {
    const [invoices, assignments] = await Promise.all([
      academy.listInvoiceReminderCandidates(),
      academy.listAssignmentReminderCandidates(),
    ]);
    let emailSent = 0;
    let smsSent = 0;
    let emailFailed = 0;
    let smsFailed = 0;
    let eventsAttempted = 0;
    const record = (result) => {
      if (!result) return;
      eventsAttempted += 1;
      if (!result.email.skipped) {
        if (result.email.sent) emailSent += 1;
        else emailFailed += 1;
      }
      if (!result.sms.skipped) {
        if (result.sms.sent) smsSent += 1;
        else smsFailed += 1;
      }
    };

    for (let index = 0; index < invoices.length; index += 5) {
      const batch = invoices.slice(index, index + 5);
      const results = await Promise.all(batch.map((invoice) => sendReminder(
        invoice,
        invoice.type,
        invoice.type === 'invoice_due_today'
          ? `MITA Academy invoice due today: ${invoice.title}`
          : `MITA Academy invoice overdue: ${invoice.title}`,
        `Your invoice "${invoice.title}" for GHS ${invoice.amount.toFixed(2)} is ${invoice.type === 'invoice_due_today' ? 'due today' : 'overdue'}. Due date: ${invoice.dueDate}. Sign in to review your fees.`,
        `MITA Academy: Invoice "${invoice.title}" for GHS ${invoice.amount.toFixed(2)} is ${invoice.type === 'invoice_due_today' ? 'due today' : 'overdue'}.`
      )));
      results.forEach(record);
    }

    for (let index = 0; index < assignments.length; index += 5) {
      const batch = assignments.slice(index, index + 5);
      const dueAt = (assignment) => new Date(assignment.dueAt).toISOString();
      const results = await Promise.all(batch.map((assignment) => sendReminder(
        assignment,
        assignment.type,
        assignment.type === 'assignment_overdue_reminder'
          ? `MITA Academy assignment overdue: ${assignment.title}`
          : `MITA Academy assignment deadline: ${assignment.title}`,
        assignment.type === 'assignment_overdue_reminder'
          ? `The assignment "${assignment.title}" in ${assignment.courseName} was due at ${dueAt(assignment)} and has not been submitted. Sign in to submit your work.`
          : `The assignment "${assignment.title}" in ${assignment.courseName} is due at ${dueAt(assignment)}. Sign in to review the instructions and submit your work.`,
        assignment.type === 'assignment_overdue_reminder'
          ? `MITA Academy: "${assignment.title}" in ${assignment.courseName} was due at ${dueAt(assignment)} and is not submitted.`
          : `MITA Academy reminder: "${assignment.title}" in ${assignment.courseName} is due at ${dueAt(assignment)}.`,
      )));
      results.forEach(record);
    }

    return NextResponse.json({ eventsAttempted, emailSent, smsSent, emailFailed, smsFailed });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy reminder delivery error:', error);
    return NextResponse.json({ error: 'Could not process Academy reminders.' }, { status: 500 });
  }
}
