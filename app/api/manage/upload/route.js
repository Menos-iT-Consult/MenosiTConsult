import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const r2 = require('../../../../backend/r2');
const { requireAuth } = require('../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');

export async function POST(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const mime = (request.headers.get('content-type') || '').split(';')[0].trim();
    const bytes = Buffer.from(await request.arrayBuffer());
    if (bytes.length === 0) {
      return NextResponse.json({ error: 'Empty upload.' }, { status: 400 });
    }
    if (bytes.length > 16 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 16 MB).' }, { status: 400 });
    }
    if (r2.r2Enabled()) {
      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
      if (!ALLOWED.includes(mime)) {
        return NextResponse.json({ error: 'Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.' }, { status: 400 });
      }
      const put = await r2.putImage(bytes, mime);
      const id = put.key.match(/img-[a-z0-9]+/)[0];
      const saved = await db.saveImageRef(id, mime, put.size, put.key, put.publicUrl);
      return NextResponse.json(saved, { status: 201 });
    }
    const saved = await db.saveImage(bytes, mime);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    if (err.badRequest) return NextResponse.json({ error: err.message }, { status: 400 });
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to upload image.' }, { status: 500 });
  }
}
