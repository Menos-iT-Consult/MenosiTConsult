import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { normalizeSupportTicketInput } = require('../../../../../lib/academy-portal');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

async function getActiveStudent(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return null;
  const student = await academy.getStudent(studentId);
  return student?.status === 'active' ? student : null;
}

export async function GET(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    return NextResponse.json(
      { tickets: await academy.listStudentSupportTickets(student.id) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student support tickets error:', error);
    return NextResponse.json({ error: 'Could not load support requests.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const input = normalizeSupportTicketInput(await request.json().catch(() => null));
    if (!input) {
      return NextResponse.json(
        { error: 'Enter a subject (5–120 characters) and message (10–4,000 characters).' },
        { status: 400 }
      );
    }
    const ticket = await academy.createStudentSupportTicket(student.id, input);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student support ticket create error:', error);
    return NextResponse.json({ error: 'Could not submit the support request.' }, { status: 500 });
  }
}
