import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const invitations = require('../../../../../../../lib/academy-invitations');
const mailer = require('../../../../../../../backend/mailer');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

export async function POST(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    const staff = await academy.getStaff(id);
    if (!staff || staff.role !== 'instructor' || staff.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending instructor invitations can be resent.' }, { status: 404 });
    }

    const invitation = invitations.createInstructorInvitationToken();
    const updated = await academy.rotateInstructorInvitation(
      id,
      invitation.tokenHash,
      invitation.expiresAt
    );
    if (!updated) {
      return NextResponse.json({ error: 'The instructor invitation is no longer pending.' }, { status: 409 });
    }

    const siteUrl = (
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin
    ).replace(/\/$/, '');
    const setupUrl = `${siteUrl}/instructor/setup?token=${encodeURIComponent(invitation.token)}`;
    let delivery;
    try {
      delivery = await mailer.sendInstructorInvitationEmail({
        to: updated.email,
        name: updated.name,
        setupUrl,
      });
    } catch (emailError) {
      console.error('Academy instructor invitation email error:', emailError);
      return NextResponse.json(
        { error: 'The account is still pending, but email delivery failed. Check SMTP settings and resend.' },
        { status: 502 }
      );
    }
    if (!delivery.ok) {
      console.error('Academy instructor invitation email was not sent:', delivery.error);
      return NextResponse.json(
        { error: 'The account is still pending, but email delivery failed. Check SMTP settings and resend.' },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy instructor invitation resend error:', err);
    return NextResponse.json({ error: 'Could not resend the instructor invitation.' }, { status: 500 });
  }
}
