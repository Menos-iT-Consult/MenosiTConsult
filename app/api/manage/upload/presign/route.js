import { NextResponse } from 'next/server';

const r2 = require('../../../../../backend/r2');
const { requireAuth } = require('../../../../../lib/require-auth');
const { cleanStr } = require('../../../../../lib/manage-helpers');

const UPLOAD_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    if (!r2.r2Enabled()) {
      return NextResponse.json({ error: 'Direct uploads unavailable (R2 not configured).', fallback: true }, { status: 501 });
    }
    const mime = cleanStr(request.nextUrl.searchParams.get('mime')).split(';')[0].trim();
    if (!UPLOAD_MIMES.includes(mime)) {
      return NextResponse.json({ error: 'Unsupported image type. Use JPEG, PNG, WebP, GIF or AVIF.' }, { status: 400 });
    }
    const signed = await r2.presignPut(mime);
    return NextResponse.json({ id: signed.id, key: signed.key, mime: signed.mime, uploadUrl: signed.uploadUrl, publicUrl: signed.publicUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to sign upload.' }, { status: 500 });
  }
}
