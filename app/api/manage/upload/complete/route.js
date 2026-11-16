import { NextResponse } from 'next/server';

const db = require('../../../../../backend/db');
const r2 = require('../../../../../backend/r2');
const { requireAuth } = require('../../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const { cleanStr } = require('../../../../../lib/manage-helpers');

const UPLOAD_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const DIRECT_MAX_BYTES = 100 * 1024 * 1024;

export async function POST(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    if (!r2.r2Enabled()) {
      return NextResponse.json({ error: 'R2 not configured.' }, { status: 501 });
    }
    const body = await request.json().catch(() => ({}));
    const b = body || {};
    const m = typeof b.key === 'string' && b.key.match(/^media\/(\d{4})\/(img-[a-z0-9]+)\.([a-z0-9]+)$/);
    if (!m) return NextResponse.json({ error: 'Invalid object key.' }, { status: 400 });
    if (!UPLOAD_MIMES.includes(cleanStr(b.mime))) {
      return NextResponse.json({ error: 'Unsupported image type.' }, { status: 400 });
    }
    const size = Number(b.size);
    if (!Number.isFinite(size) || size <= 0 || size > DIRECT_MAX_BYTES) {
      return NextResponse.json({ error: 'Invalid file size.' }, { status: 400 });
    }
    const id = m[2];
    const publicUrl = r2.publicBase() ? `${r2.publicBase()}/${b.key}` : null;
    const saved = await db.saveImageRef(id, cleanStr(b.mime), Math.round(size), b.key, publicUrl);
    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to register upload.' }, { status: 500 });
  }
}
