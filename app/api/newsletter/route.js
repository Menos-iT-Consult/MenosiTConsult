import { NextResponse } from 'next/server';

const nodemailer = require('nodemailer');
const db = require('../../../backend/db');
const mailer = require('../../../backend/mailer');
const { requireDbResponse, noDbErrorResponse } = require('../../../lib/api-helpers');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request) {
  if (!db.pool) return requireDbResponse();
  const body = await request.json().catch(() => ({}));
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  try {
    const existing = await db.getSubscribers();
    const already = existing.find(s => s.email.toLowerCase() === email.toLowerCase());
    if (already) {
      return NextResponse.json({ success: true, message: "You're already subscribed — thanks!" });
    }

    await db.addSubscriber(email);
    const total = (await db.getSubscribers()).length;

    mailer.sendWelcomeEmail({ email }).catch((err) => {
      console.error('Subscribe welcome email error:', err);
    });

    try {
      await transporter.sendMail({
        from: `"Menos iT Website" <${mailer.getMainFromAddress()}>`,
        to: process.env.RECIPIENT_EMAIL,
        subject: 'New newsletter subscriber',
        html: `
          <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;color:#0f172a">
            <p style="margin:0 0 12px">A new visitor subscribed to the Menos iT newsletter:</p>
            <p style="background:#eaf7fe;border-radius:8px;padding:14px 18px;margin:0;font-weight:600;color:#0077b6">${email}</p>
            <p style="font-size:13px;color:#94a3b8;margin:16px 0 0">Total subscribers: ${total}</p>
          </div>`,
      });
    } catch (err) {
      console.error('Newsletter notify error:', err);
    }

    return NextResponse.json({ success: true, message: "You're subscribed! Practical IT tips coming your way." });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Could not subscribe at this time.' }, { status: 500 });
  }
}
