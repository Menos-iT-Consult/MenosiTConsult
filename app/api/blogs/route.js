import { NextResponse } from 'next/server';

const db = require('../../../backend/db');
const { requireAuth } = require('../../../lib/require-auth');
const { requireDbResponse, noDbErrorResponse } = require('../../../lib/api-helpers');

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function GET(request) {
  if (!db.pool) return requireDbResponse();
  try {
    let blogs = await db.getBlogs();
    if (request.nextUrl.searchParams.get('status') === 'published') {
      blogs = blogs.filter(b => b.status === 'published');
    }
    return NextResponse.json(blogs);
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!db.pool) return requireDbResponse();
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const newBlog = {
      id: generateId(),
      title: body.title || '',
      slug: body.slug || '',
      category: body.category || '',
      readTime: body.readTime || '',
      excerpt: body.excerpt || '',
      content: body.content || '',
      featured: !!body.featured,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    return NextResponse.json(await db.createBlog(newBlog), { status: 201 });
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
