import { NextResponse } from 'next/server';

const bcrypt = require('bcryptjs');
const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { verifyAcademyPassword } = require('../../../../../lib/academy-password');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

// Staff member changes their own password.
export async function PUT(request) {
  const id = auth.getStaffId(request);
  if (!id) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const current = String(body.currentPassword || '');
  const next = String(body.newPassword || '');

  if (!current || !next) {
    return NextResponse.json({ error: 'Enter your current and new password.' }, { status: 400 });
  }
  if (next.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    const creds = await academy.getStaffCredentials(id);
    if (!creds || creds.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    if (!await verifyAcademyPassword(current, creds.passwordHash)) {
      return NextResponse.json({ error: 'Your current password is not correct.' }, { status: 400 });
    }
    if (await verifyAcademyPassword(next, creds.passwordHash)) {
      return NextResponse.json({ error: 'Choose a password you have not used before.' }, { status: 400 });
    }
    await academy.updateStaffPassword(id, bcrypt.hashSync(next, 12));
    return NextResponse.json({ success: true });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff password error:', err);
    return NextResponse.json({ error: 'Could not change your password.' }, { status: 500 });
  }
}
