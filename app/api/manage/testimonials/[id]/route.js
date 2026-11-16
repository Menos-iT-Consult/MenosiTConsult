import { NextResponse } from 'next/server';

const db = require('../../../../../backend/db');
const { requireAuth } = require('../../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const { cleanStr, clampRating, cleanStatus, cleanImage } = require('../../../../../lib/manage-helpers');

export async function GET(request, { params }) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const t = await db.getTestimonial(id);
    if (!t) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(t);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to load testimonial.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.getTestimonial(id);
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const req = await request.json().catch(() => ({}));
    const b = req || {};
    const t = await db.updateTestimonial(id, {
      name: cleanStr(b.name) || existing.name,
      role: cleanStr(b.role),
      company: cleanStr(b.company),
      location: cleanStr(b.location),
      rating: clampRating(b.rating, existing.rating),
      quote: cleanStr(b.quote) || existing.quote,
      image: b.image === undefined ? existing.image : cleanImage(b.image),
      featured: b.featured === undefined ? existing.featured : !!b.featured,
      status: cleanStatus(b.status, existing.status),
    });
    return NextResponse.json(t);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to update testimonial.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.deleteTestimonial(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete testimonial.' }, { status: 500 });
  }
}
