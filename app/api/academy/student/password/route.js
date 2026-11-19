import { NextResponse } from 'next/server';

const bcrypt = require('bcryptjs');
const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { sendStudentNotification } = require('../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

// Change password (also clears must_change_password, ending the first-login
// guide). Requires the current password — including when the current password
// is the default (the Student ID itself).
export async function PUT(request) {
  const id = auth.getStudentId(request);
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
    const creds = await academy.getStudentCredentials(id);
    if (!creds || creds.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    if (!creds.passwordHash || !bcrypt.compare(current, creds.passwordHash)) {
      return NextResponse.json({ error: 'Your current password is not correct.' }, { status: 400 });
    }
    if (bcrypt.compare(next, creds.passwordHash)) {
      return NextResponse.json({ error: 'Choose a password you have not used before.' }, { status: 400 });
    }
    await academy.updateStudentPassword(id, bcrypt.hashSync(next, 12));
    const student = await academy.getStudent(id);
    const notifications = await sendStudentNotification(student, {
      type: 'password_changed',
      subject: 'Your MITA Academy password was changed',
      message: `The password for your MITA Academy account was changed. If you did not make this change, contact the Academy immediately.`,
    });
    return NextResponse.json({ success: true, notifications });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy password change error:', err);
    return NextResponse.json({ error: 'Could not change your password.' }, { status: 500 });
  }
}
