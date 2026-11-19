import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');
const { verifyStudentIdVerificationToken } = require('../../../../../../lib/academy-id-verification');

export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const studentId = verifyStudentIdVerificationToken(token);
    if (!studentId) {
      return NextResponse.json({ valid: false }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const student = await academy.getStudentByStudentId(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ valid: false }, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(
      {
        valid: true,
        student: {
          studentId: student.studentId,
          name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === 'ACADEMY_ID_VERIFICATION_SECRET') {
      return NextResponse.json({ error: 'Student ID verification is not configured.' }, { status: 503 });
    }
    console.error('Academy student ID verification error:', error);
    return NextResponse.json({ error: 'Could not verify this student ID.' }, { status: 500 });
  }
}
