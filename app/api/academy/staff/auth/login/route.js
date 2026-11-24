import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const auth = require('../../../../../../lib/academy-auth');
const { verifyAcademyPassword } = require('../../../../../../lib/academy-password');
const {
  createLoginProtectionKeys,
  getClientIp,
  loginProtectionResponse,
} = require('../../../../../../lib/academy-login-rate-limit');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

// MITA staff login (email + password). Sets the academy_staff cookie used to
// gate /academy/admin/* in middleware.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim();
  const password = String(body.password || '');

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  try {
    if (!process.env.SESSION_SECRET) {
      return NextResponse.json(
        { error: 'Sign-in is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const protectionKeys = createLoginProtectionKeys({
      accountType: 'staff',
      account: email,
      clientIp: getClientIp(request),
      secret: process.env.SESSION_SECRET,
    });
    const protection = await academy.reserveAcademyLoginAttempts(protectionKeys);
    if (!protection.allowed) {
      const blocked = loginProtectionResponse(protection.retryAfterSeconds);
      return NextResponse.json(
        { error: blocked.message },
        { status: 429, headers: { 'Retry-After': String(blocked.seconds) } }
      );
    }

    const creds = await academy.getStaffAuthByEmail(email);
    if (!creds || creds.status !== 'active') {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    if (!await verifyAcademyPassword(password, creds.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, role: creds.role });
    auth.setAcademyCookie(response, auth.STAFF_COOKIE, creds.id, auth.STAFF_MAX_AGE);
    await academy.clearAcademyLoginAttempts(protectionKeys);
    return response;
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff login error:', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
