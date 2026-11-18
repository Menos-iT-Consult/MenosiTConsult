import { NextResponse } from 'next/server';

const db = require('../../../backend/db');
const mailer = require('../../../backend/mailer');

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { firstName, lastName, email, phone, service, source, message } = body;

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }

  const msgEntry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    read: false,
    name: `${firstName} ${lastName}`,
    email,
    phone: phone || '',
    service: service || '',
    source: source || '',
    message,
  };

  let persisted = false;
  let storageWhere = '';
  try {
    await db.saveMessage(msgEntry);
    persisted = true;
    storageWhere = 'database';
  } catch (err) {
    try {
      await db.saveMessageFile(msgEntry);
      persisted = true;
      storageWhere = 'file';
    } catch (fileErr) {
      console.error('Contact persist error:', err, fileErr);
    }
  }

  try {
    await db.addSubscriber(email, firstName, lastName);
  } catch (err) {
    console.warn('[contact] could not add to newsletter:', err.message || err);
  }

  const mail = await mailer.sendContactEmails(msgEntry);
  if (!mail.configured) {
    console.warn('[contact] SMTP not configured — enquiry saved without emails.');
  }

  if (persisted || mail.admin.ok || mail.customer.ok) {
    return NextResponse.json({
      success: true,
      message: "Message sent! We'll get back to you within one business day.",
      storedIn: storageWhere,
      notifiedAdmin: mail.admin.ok,
      confirmedCustomer: mail.customer.ok,
    });
  }

  const reason = mail.admin.error || mail.customer.error || 'delivery error';
  return NextResponse.json(
    {
      error: `Sorry, your message could not be delivered right now (${reason}). Please email us directly at ${mail.recipient || mailer.getMainFromAddress()}.`,
    },
    { status: 500 }
  );
}
