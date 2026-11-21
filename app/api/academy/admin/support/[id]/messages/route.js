import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { normalizeSupportMessage } = require('../../../../../../../lib/academy-portal');
const { sendStudentNotification } = require('../../../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

export async function POST(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const message = normalizeSupportMessage(await request.json().catch(() => null));
    if (!message) {
      return NextResponse.json({ error: 'Reply must be between 2 and 4,000 characters.' }, { status: 400 });
    }
    const created = await academy.addSupportMessage({
      ticketId: id,
      senderId: gate.staff.id,
      senderRole: 'admin',
      message,
    });
    if (!created) return NextResponse.json({ error: 'Support request not found.' }, { status: 404 });
    const student = await academy.getStudent(created.studentId);
    const notifications = student
      ? await sendStudentNotification(student, {
          type: 'support_response',
          subject: `MITA Academy support update: ${created.subject}`,
          message: `The Academy has replied to your support request "${created.subject}". Sign in to the student portal to view the response.`,
          metadata: { ticketId: id },
        })
      : null;
    return NextResponse.json({ message: created, notifications }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === 'SUPPORT_TICKET_RESOLVED') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Academy admin support reply error:', error);
    return NextResponse.json({ error: 'Could not send the support response.' }, { status: 500 });
  }
}
