import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const mailer = require('../../../../backend/mailer');
const { requireAuth } = require('../../../../lib/require-auth');
const { requireDbResponse } = require('../../../../lib/api-helpers');

export async function POST(request) {
  if (!db.pool) return requireDbResponse();
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const { subject, message, testOnly } = body || {};

  if (!subject || !message) {
    return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
  }

  try {
    const result = await mailer.sendTipEmails({
      subject,
      message,
      testOnly: !!testOnly,
    });

    if (result.error) {
      return NextResponse.json({
        success: false,
        message: result.error,
        configured: result.configured,
      });
    }

    return NextResponse.json({
      success: true,
      message: testOnly
        ? `Test tip sent to ${result.testRecipient}.`
        : `Tip sent to ${result.sent}/${result.total} subscribers.`,
      sent: result.sent,
      failed: result.failed,
      total: result.total,
      errors: result.errors,
    });
  } catch (err) {
    console.error('Tip broadcast error:', err);
    return NextResponse.json({
      success: false,
      message: err && err.message ? err.message : 'Broadcast failed.',
    }, { status: 500 });
  }
}
