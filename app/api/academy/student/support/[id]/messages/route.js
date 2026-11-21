import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const auth = require('../../../../../../../lib/academy-auth');
const { normalizeSupportMessage } = require('../../../../../../../lib/academy-portal');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

export async function POST(request, { params }) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const { id } = await params;
    const message = normalizeSupportMessage(await request.json().catch(() => null));
    if (!message) {
      return NextResponse.json({ error: 'Reply must be between 2 and 4,000 characters.' }, { status: 400 });
    }
    const created = await academy.addSupportMessage({
      ticketId: id,
      senderId: student.id,
      senderRole: 'student',
      message,
    });
    if (!created) return NextResponse.json({ error: 'Support request not found.' }, { status: 404 });
    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student support reply error:', error);
    return NextResponse.json({ error: 'Could not send your reply.' }, { status: 500 });
  }
}
