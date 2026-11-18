import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const invitations = require('../../../../../lib/academy-invitations');
const mailer = require('../../../../../backend/mailer');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function deliverInvitation(request, staff, token) {
  const siteUrl = (
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin
  ).replace(/\/$/, '');
  const setupUrl = `${siteUrl}/instructor/setup?token=${encodeURIComponent(token)}`;
  return mailer.sendInstructorInvitationEmail({
    to: staff.email,
    name: staff.name,
    setupUrl,
  });
}

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const staff = await academy.listStaff();
    return NextResponse.json(staff);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff list error:', err);
    return NextResponse.json({ error: 'Could not load staff accounts.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    if (!name || name.length > 120 || !email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'Provide a name (120 characters or fewer) and a valid email address.' },
        { status: 400 }
      );
    }

    if (await academy.getStaffByEmail(email)) {
      return NextResponse.json({ error: 'A staff account with this email already exists.' }, { status: 409 });
    }

    const invitation = invitations.createInstructorInvitationToken();
    const staff = await academy.createInstructorInvitation({
      name,
      email,
      tokenHash: invitation.tokenHash,
      expiresAt: invitation.expiresAt,
    });

    try {
      const delivery = await deliverInvitation(request, staff, invitation.token);
      if (!delivery.ok) {
        console.error('Academy instructor invitation email was not sent:', delivery.error);
        return NextResponse.json(
          {
            error: 'The instructor account is pending, but the invitation email could not be sent. Retry the invitation after checking SMTP settings.',
            staff,
            invitationPending: true,
          },
          { status: 502 }
        );
      }
    } catch (emailError) {
      console.error('Academy instructor invitation email error:', emailError);
      return NextResponse.json(
        {
          error: 'The instructor account is pending, but the invitation email could not be sent. Retry the invitation after checking SMTP settings.',
          staff,
          invitationPending: true,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ staff, invitationSent: true }, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    if (err.code === '23505') {
      return NextResponse.json({ error: 'A staff account with this email already exists.' }, { status: 409 });
    }
    console.error('Academy instructor create error:', err);
    return NextResponse.json({ error: 'Could not issue the instructor account.' }, { status: 500 });
  }
}
