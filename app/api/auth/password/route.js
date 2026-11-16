import { NextResponse } from 'next/server';

const bcrypt = require('bcryptjs');
const db = require('../../../../backend/db');
const { requireAuth } = require('../../../../lib/require-auth');

export async function PUT(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Both current and new passwords are required.' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 });
  }
  try {
    const admin = await db.getAdmin();
    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.updateAdminPassword(newHash);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Password update error:', err);
    if (err.noDb) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Password update failed.' }, { status: 500 });
  }
}
