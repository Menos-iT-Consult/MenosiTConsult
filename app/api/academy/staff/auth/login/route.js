import { NextResponse } from 'next/server';

const bcrypt = require('bcryptjs');
const academy = require('../../../../../../backend/academy-db');
const auth = require('../../../../../../lib/academy-auth');
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
    const creds = await academy.getStaffAuthByEmail(email);
    if (!creds || creds.status !== 'active') {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }
    if (!creds.passwordHash || !bcrypt.compare(password, creds.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, role: creds.role });
    auth.setAcademyCookie(response, auth.STAFF_COOKIE, creds.id, auth.STAFF_MAX_AGE);
    return response;
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff login error:', err);
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}
