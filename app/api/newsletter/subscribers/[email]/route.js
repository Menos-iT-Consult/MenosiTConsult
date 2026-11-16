import { NextResponse } from 'next/server';

const db = require('../../../../../backend/db');
const { requireAuth } = require('../../../../../lib/require-auth');
const { requireDbResponse, noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function DELETE(request, { params }) {
  if (!db.pool) return requireDbResponse();
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { email } = await params;
    const emailParam = decodeURIComponent(email);
    const existing = await db.getSubscribers();
    const found = existing.find(s => s.email.toLowerCase() === emailParam.toLowerCase());
    if (!found) return NextResponse.json({ error: 'Subscriber not found.' }, { status: 404 });
    await db.deleteSubscriber(found.email);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
