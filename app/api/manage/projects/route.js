import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const { requireAuth } = require('../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { newId, cleanStr, cleanStatus, cleanImage, cleanOutcomes } = require('../../../../lib/manage-helpers');

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    return NextResponse.json(await db.getProjects());
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to load projects.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const b = body || {};
    if (!cleanStr(b.title)) return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    let id = newId('prj');
    if (cleanStr(b.id)) {
      const wanted = cleanStr(b.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
      if (wanted) {
        if (await db.getProject(wanted)) {
          return NextResponse.json({ error: 'A project with that id already exists.' }, { status: 409 });
        }
        id = wanted;
      }
    }
    const p = await db.createProject({
      id,
      title: cleanStr(b.title).slice(0, 200),
      category: cleanStr(b.category).slice(0, 40),
      client: cleanStr(b.client).slice(0, 120),
      location: cleanStr(b.location).slice(0, 120),
      description: cleanStr(b.description).slice(0, 4000),
      image: cleanImage(b.image),
      outcomes: cleanOutcomes(b.outcomes, []),
      year: cleanStr(b.year).slice(0, 10),
      featured: !!b.featured,
      status: cleanStatus(b.status, 'published'),
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json(p, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to create project.' }, { status: 500 });
  }
}
