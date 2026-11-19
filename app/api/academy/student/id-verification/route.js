import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const { createStudentIdVerificationToken } = require('../../../../../lib/academy-id-verification');

export async function GET(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    if (!student.studentId) {
      return NextResponse.json({ error: 'A Student ID has not been issued to this account.' }, { status: 409 });
    }

    const token = createStudentIdVerificationToken(student.studentId);
    return NextResponse.json(
      { path: `/academy/verify/${encodeURIComponent(token)}` },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === 'ACADEMY_ID_VERIFICATION_SECRET') {
      return NextResponse.json({ error: 'Student ID verification is not configured.' }, { status: 503 });
    }
    console.error('Academy student ID verification token error:', error);
    return NextResponse.json({ error: 'Could not create the student ID verification code.' }, { status: 500 });
  }
}
