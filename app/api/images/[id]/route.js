import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const r2 = require('../../../../backend/r2');
const { requireDbResponse, noDbErrorResponse } = require('../../../../lib/api-helpers');

export async function GET(request, { params }) {
  if (!db.pool) return requireDbResponse();
  try {
    const { id } = await params;
    const img = await db.getImage(id);
    if (!img) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });

    if (img.storage === 'r2') {
      const base = r2.publicBase();
      if (base) {
        const res = NextResponse.redirect(`${base}/${img.r2Key}`, 302);
        res.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return res;
      }
      try {
        const bytes = await r2.getImageBytes(img.r2Key);
        return new Response(new Uint8Array(bytes), {
          status: 200,
          headers: {
            'Content-Type': img.mime,
            'Content-Length': String(bytes.length),
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } catch (err) {
        console.error('[images] R2 fetch failed:', err.message);
        return NextResponse.json({ error: 'Failed to fetch image from storage.' }, { status: 502 });
      }
    }

    return new Response(new Uint8Array(img.bytes), {
      status: 200,
      headers: {
        'Content-Type': img.mime,
        'Content-Length': String(img.bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('[images] error:', err.message);
    return NextResponse.json({ error: 'Failed to load image.' }, { status: 500 });
  }
}
