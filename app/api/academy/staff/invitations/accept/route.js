import { NextResponse } from 'next/server';

const bcrypt = require('bcryptjs');
const academy = require('../../../../../../backend/academy-db');
const invitations = require('../../../../../../lib/academy-invitations');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const tokenHash = invitations.hashInstructorInvitationToken(body.token);
  const password = String(body.password || '');
  if (!tokenHash || password.length < 8 || password.length > 200) {
    return NextResponse.json(
      { error: 'Use a valid invitation link and a password between 8 and 200 characters.' },
      { status: 400 }
    );
  }

  try {
    const staff = await academy.acceptInstructorInvitation(
      tokenHash,
      bcrypt.hashSync(password, 12)
    );
    if (!staff) {
      return NextResponse.json(
        { error: 'This invitation is invalid, expired, or already used. Ask an Academy administrator to resend it.' },
        { status: 410 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy instructor invitation acceptance error:', err);
    return NextResponse.json({ error: 'Could not set up your instructor account.' }, { status: 500 });
  }
}
