import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const invitations = require('../../../../../lib/academy-invitations');
const { deliverInstructorInvitation } = require('../../../../../lib/academy-invitation-delivery');
const { normalizeGhanaRecipient } = require('../../../../../lib/academy-sms');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const { getAcademySiteUrl } = require('../../../../../lib/academy-site-url');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function deliverInvitation(request, staff, token) {
  const siteUrl = getAcademySiteUrl(request);
  const setupUrl = `${siteUrl}/instructor/setup?token=${encodeURIComponent(token)}`;
  return deliverInstructorInvitation(staff, setupUrl);
}

function deliveryError(delivery) {
  const failed = Object.entries(delivery)
    .filter(([, result]) => !result.sent)
    .map(([channel]) => channel);
  return `The instructor account is pending, but ${failed.join(' and ')} delivery failed. Check the ${failed.join(' and ')} settings and resend the invitation.`;
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
    const phone = String(body.phone || '').trim();
    const normalizedPhone = normalizeGhanaRecipient(phone);
    if (!name || name.length > 120 || !email || !EMAIL_RE.test(email) || !normalizedPhone) {
      return NextResponse.json(
        { error: 'Provide a name, valid email address, and Ghana mobile number for the SMS invitation.' },
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
      phone: normalizedPhone,
      tokenHash: invitation.tokenHash,
      expiresAt: invitation.expiresAt,
    });

    const delivery = await deliverInvitation(request, staff, invitation.token);
    if (!delivery.email.sent || !delivery.sms.sent) {
      return NextResponse.json(
        {
          error: deliveryError(delivery),
          staff,
          invitationPending: true,
          delivery,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ staff, invitationSent: true, delivery }, { status: 201 });
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
