import { NextResponse } from 'next/server';

const db = require('../../../../../backend/db');
const { requireAuth } = require('../../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const { cleanStr, cleanStatus, cleanImage, cleanOutcomes } = require('../../../../../lib/manage-helpers');

export async function GET(request, { params }) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const p = await db.getProject(id);
    if (!p) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    return NextResponse.json(p);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to load project.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.getProject(id);
    if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const b = body || {};
    const p = await db.updateProject(id, {
      title: cleanStr(b.title) || existing.title,
      category: cleanStr(b.category),
      client: cleanStr(b.client),
      location: cleanStr(b.location),
      description: cleanStr(b.description),
      image: b.image === undefined ? existing.image : cleanImage(b.image),
      outcomes: cleanOutcomes(b.outcomes, existing.outcomes),
      year: cleanStr(b.year),
      featured: b.featured === undefined ? existing.featured : !!b.featured,
      status: cleanStatus(b.status, existing.status),
    });
    return NextResponse.json(p);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to update project.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    await db.deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete project.' }, { status: 500 });
  }
}
