import { NextResponse } from 'next/server';

const db = require('../../../../../backend/db');
const { requireDbResponse, noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request, { params }) {
  if (!db.pool) return requireDbResponse();
  try {
    const { slug } = await params;
    const blog = await db.getBlogBySlug(slug);
    if (!blog || blog.status !== 'published') {
      return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 });
    }
    return NextResponse.json(blog);
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
