import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const invitations = require('../../../../../../../lib/academy-invitations');
const { deliverInstructorInvitation } = require('../../../../../../../lib/academy-invitation-delivery');
const { normalizeAcademyPhone } = require('../../../../../../../lib/academy-sms');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const { getAcademySiteUrl } = require('../../../../../../../lib/academy-site-url');

function deliveryError(delivery) {
  const failed = Object.entries(delivery)
    .filter(([, result]) => !result.sent)
    .map(([channel]) => channel);
  return `The account is still pending, but ${failed.join(' and ')} delivery failed. Check the ${failed.join(' and ')} settings and resend.`;
}

export async function POST(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    let staff = await academy.getStaff(id);
    if (!staff || staff.role !== 'instructor' || staff.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending instructor invitations can be resent.' }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const requestedPhone = body.phone == null ? staff.phone : String(body.phone).trim();
    const phone = normalizeAcademyPhone(requestedPhone);
    if (!phone) {
      return NextResponse.json({ error: 'Provide a valid supported mobile number for the SMS invitation. Use +country code for international numbers.' }, { status: 400 });
    }
    if (phone !== staff.phone) {
      staff = await academy.updateStaff(id, { phone });
      if (!staff) return NextResponse.json({ error: 'Instructor account not found.' }, { status: 404 });
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

    const siteUrl = getAcademySiteUrl(request);
    const setupUrl = `${siteUrl}/instructor/setup?token=${encodeURIComponent(invitation.token)}`;
    const delivery = await deliverInstructorInvitation(updated, setupUrl);
    if (!delivery.email.sent || !delivery.sms.sent) {
      return NextResponse.json(
        { error: deliveryError(delivery), delivery },
        { status: 502 }
      );
    }
    return NextResponse.json({ success: true, delivery });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy instructor invitation resend error:', err);
    return NextResponse.json({ error: 'Could not resend the instructor invitation.' }, { status: 500 });
  }
}
