import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const { requireAuth } = require('../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { newId, cleanStr, clampRating, cleanStatus, cleanImage } = require('../../../../lib/manage-helpers');

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    return NextResponse.json(await db.getTestimonials());
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to load testimonials.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const b = body || {};
    if (!cleanStr(b.name) || !cleanStr(b.quote)) {
      return NextResponse.json({ error: 'Name and quote are required.' }, { status: 400 });
    }
    let id = newId('tst');
    if (cleanStr(b.id)) {
      const wanted = cleanStr(b.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
      if (wanted) {
        if (await db.getTestimonial(wanted)) {
          return NextResponse.json({ error: 'A testimonial with that id already exists.' }, { status: 409 });
        }
        id = wanted;
      }
    }
    const t = await db.createTestimonial({
      id,
      name: cleanStr(b.name).slice(0, 120),
      role: cleanStr(b.role).slice(0, 120),
      company: cleanStr(b.company).slice(0, 120),
      location: cleanStr(b.location).slice(0, 120),
      rating: clampRating(b.rating, 5),
      quote: cleanStr(b.quote).slice(0, 2000),
      image: cleanImage(b.image),
      featured: !!b.featured,
      status: cleanStatus(b.status, 'published'),
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json(t, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to create testimonial.' }, { status: 500 });
  }
}
