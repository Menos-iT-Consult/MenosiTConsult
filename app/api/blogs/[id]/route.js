import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const { requireAuth } = require('../../../../lib/require-auth');
const { requireDbResponse, noDbErrorResponse } = require('../../../../lib/api-helpers');

export async function GET(request, { params }) {
  if (!db.pool) return requireDbResponse();
  try {
    const { id } = await params;
    const blog = await db.getBlog(id);
    if (!blog) return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 });
    return NextResponse.json(blog);
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!db.pool) return requireDbResponse();
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.getBlog(id);
    if (!existing) return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const updated = {
      ...existing,
      title: body.title !== undefined ? body.title : existing.title,
      slug: body.slug !== undefined ? body.slug : existing.slug,
      category: body.category !== undefined ? body.category : existing.category,
      readTime: body.readTime !== undefined ? body.readTime : existing.readTime,
      excerpt: body.excerpt !== undefined ? body.excerpt : existing.excerpt,
      content: body.content !== undefined ? body.content : existing.content,
      featured: body.featured !== undefined ? !!body.featured : existing.featured,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(await db.updateBlog(id, updated));
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!db.pool) return requireDbResponse();
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const existing = await db.getBlog(id);
    if (!existing) return NextResponse.json({ error: 'Blog post not found.' }, { status: 404 });
    await db.deleteBlog(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Database error.' }, { status: 500 });
  }
}
