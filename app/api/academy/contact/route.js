import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const mailer = require('../../../../backend/mailer');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { normalizeAcademySiteSettings } = require('../../../../lib/academy-site-settings');
const { validateAcademyContactMessage } = require('../../../../lib/academy-contact-validation');

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const validation = validateAcademyContactMessage(body);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const stored = await academy.getAcademySetting('site_contact');
    const settings = normalizeAcademySiteSettings(stored);
    const { name, email, phone, subject, message } = validation.message;
    const delivery = await mailer.sendAcademyNotificationEmail({
      to: settings.email,
      replyTo: email,
      subject: `Academy contact: ${subject}`,
      message: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || 'Not provided'}`,
        '',
        message,
      ].join('\n'),
    });

    if (!delivery.ok) {
      return NextResponse.json({ error: delivery.error }, { status: 503 });
    }

    return NextResponse.json({ success: true, message: 'Your message has been sent to the Academy.' });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy contact submission error:', error);
    return NextResponse.json({ error: 'Could not send your message. Please email the Academy directly.' }, { status: 500 });
  }
}
