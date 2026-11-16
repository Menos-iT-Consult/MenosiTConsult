import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const { requireDbResponse, noDbErrorResponse } = require('../../../../lib/api-helpers');

export async function GET() {
  if (!db.pool) return requireDbResponse();
  try {
    const all = await db.getTestimonials();
    const published = all.filter(t => t.status === 'published');
    published.sort((a, b) => (b.featured - a.featured) ||
      (new Date(b.createdAt) - new Date(a.createdAt)));
    return NextResponse.json(published);
  } catch (err) {
    console.error('[content] testimonials error:', err.message);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Failed to load testimonials.' }, { status: 500 });
  }
}
