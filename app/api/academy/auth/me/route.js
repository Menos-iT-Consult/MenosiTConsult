import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

// Lightweight session probe for the portal chrome + login page redirect.
export async function GET(request) {
  const studentIdCookie = auth.getStudentId(request);
  if (!studentIdCookie) {
    return NextResponse.json({ loggedIn: false });
  }
  try {
    const student = await academy.getStudent(studentIdCookie);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ loggedIn: false });
    }
    return NextResponse.json({
      loggedIn: true,
      mustChangePassword: student.mustChangePassword,
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
      },
    });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy student me error:', err);
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}
