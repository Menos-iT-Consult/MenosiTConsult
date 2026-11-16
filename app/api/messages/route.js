import { NextResponse } from 'next/server';

const db = require('../../../backend/db');
const { requireAuth } = require('../../../lib/require-auth');
const { requireDbResponse, noDbErrorResponse } = require('../../../lib/api-helpers');

export async function GET(request) {
  if (!db.pool) return requireDbResponse();
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    return NextResponse.json(await db.getMessages());
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
