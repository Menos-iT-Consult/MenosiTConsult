import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const { requireAuth } = require('../../../../lib/require-auth');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { cleanStr } = require('../../../../lib/manage-helpers');

export async function GET(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const rows = await db.getSettings();
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return NextResponse.json(out);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const b = body || {};
    const entries = [];
    if (b.stats && typeof b.stats === 'object' && !Array.isArray(b.stats)) {
      const s = b.stats;
      const num = (v) => Math.max(0, parseInt(v, 10) || 0);
      entries.push(['stats', {
        clients: num(s.clients),
        years: num(s.years),
        satisfaction: Math.min(100, num(s.satisfaction)),
        projects: num(s.projects),
      }]);
    }
    if (b.contact && typeof b.contact === 'object' && !Array.isArray(b.contact)) {
      const c = b.contact;
      entries.push(['contact', {
        email: cleanStr(c.email).slice(0, 200),
        phone: cleanStr(c.phone).slice(0, 40),
        whatsapp: cleanStr(c.whatsapp).replace(/[^0-9]/g, '').slice(0, 20),
        location: cleanStr(c.location).slice(0, 200),
      }]);
    }
    if (b.trustedLogos && Array.isArray(b.trustedLogos)) {
      const logos = b.trustedLogos
        .map(l => (typeof l === 'string' ? { name: l } : l))
        .filter(l => l && typeof l === 'object' && cleanStr(l.name))
        .slice(0, 60)
        .map(l => ({
          name: cleanStr(l.name).slice(0, 120),
          image: cleanStr(l.image).slice(0, 500),
        }));
      if (logos.length) entries.push(['trustedLogos', logos]);
    }
    if (entries.length === 0) {
      return NextResponse.json({ error: 'No valid settings provided (expected stats and/or contact and/or trustedLogos).' }, { status: 400 });
    }
    await db.upsertSettings(entries);
    const rows = await db.getSettings();
    const out = {};
    for (const r of rows) out[r.key] = r.value;
    return NextResponse.json(out);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error(err);
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 });
  }
}
