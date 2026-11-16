import { NextResponse } from 'next/server';

const db = require('../../../../../../backend/db');
const { requireAuth } = require('../../../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');
const { cleanStatus } = require('../../../../../../lib/manage-helpers');

export async function PATCH(request, { params }) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const status = cleanStatus(body && body.status, null);
    if (!status) return NextResponse.json({ error: "status must be 'draft' or 'published'." }, { status: 400 });
    const { id } = await params;
    const t = await db.setTestimonialStatus(id, status);
    if (!t) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(t);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to update status.' }, { status: 500 });
  }
}
