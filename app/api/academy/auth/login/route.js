import { NextResponse } from 'next/server';

const bcrypt = require('bcryptjs');
const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

// Student portal login. The username is the Student ID issued at admission
// (MITA/<PROGRAM CODE>-<YEAR>-<SEQ>); the default password equals the Student
// ID until the student changes it (must_change_password).
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId || body.username || '').trim().toUpperCase();
  const password = String(body.password || '');

  if (!studentId || !password) {
    return NextResponse.json({ error: 'Student ID and password are required.' }, { status: 400 });
  }

  try {
    const creds = await academy.getStudentAuthByStudentId(studentId);
    if (!creds || creds.status === 'pending') {
      return NextResponse.json(
        { error: 'Invalid Student ID or password. If you have not been admitted yet, your application is still under review.' },
        { status: 401 }
      );
    }
    if (creds.status !== 'active') {
      return NextResponse.json(
        { error: `Your student account is ${creds.status}. Please contact the academy office.` },
        { status: 403 }
      );
    }
    if (!creds.passwordHash || !bcrypt.compare(password, creds.passwordHash)) {
      return NextResponse.json({ error: 'Invalid Student ID or password.' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      mustChangePassword: creds.mustChangePassword,
    });
    auth.setAcademyCookie(response, auth.STUDENT_COOKIE, creds.id, auth.STUDENT_MAX_AGE);
    return response;
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy student login error:', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
