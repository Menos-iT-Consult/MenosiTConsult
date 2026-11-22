import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { verifyAcademyPassword } = require('../../../../../lib/academy-password');
const {
  createStudentLoginRateLimitKeys,
  getClientIp,
} = require('../../../../../lib/academy-login-rate-limit');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

// Student portal login. The username is the Student ID issued at admission
// (MITA/<PROGRAM CODE>-<YEAR>-<SEQ>); the default password equals the Student
// ID until the student changes it (must_change_password).
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId || body.username || '').trim().toUpperCase();
  const password = String(body.password || '');

  if (!studentId || studentId.length > 120 || !password || password.length > 200) {
    return NextResponse.json(
      { error: 'Student ID and password are required and must be within the allowed length.' },
      { status: 400 }
    );
  }

  try {
    if (!process.env.SESSION_SECRET) {
      return NextResponse.json(
        { error: 'Student sign-in is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const rateLimitKeys = createStudentLoginRateLimitKeys({
      studentId,
      clientIp: getClientIp(request),
      secret: process.env.SESSION_SECRET,
    });
    const rateLimit = await academy.reserveAcademyLoginAttempts(rateLimitKeys);
    if (!rateLimit.allowed) {
      const minutes = Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60));
      return NextResponse.json(
        { error: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } }
      );
    }

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
    if (!await verifyAcademyPassword(password, creds.passwordHash)) {
      return NextResponse.json({ error: 'Invalid Student ID or password.' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      mustChangePassword: creds.mustChangePassword,
    });
    auth.setAcademyCookie(response, auth.STUDENT_COOKIE, creds.id, auth.STUDENT_MAX_AGE);
    await academy.clearAcademyLoginAttempts(rateLimitKeys);
    return response;
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy student login error:', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
