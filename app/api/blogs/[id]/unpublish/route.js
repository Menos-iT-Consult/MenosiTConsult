import { NextResponse } from 'next/server';

const db = require('../../../../../backend/db');
const { requireAuth } = require('../../../../../lib/require-auth');
const { requireDbResponse, noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function PATCH(request, { params }) {
  if (!db.pool) return requireDbResponse();
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const b = await db.setBlogStatus(id, 'draft');
    if (!b) return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 });
    return NextResponse.json(b);
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
