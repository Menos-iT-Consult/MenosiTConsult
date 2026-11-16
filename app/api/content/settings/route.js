import { NextResponse } from 'next/server';

const db = require('../../../../backend/db');
const { requireDbResponse, noDbErrorResponse } = require('../../../../lib/api-helpers');

const DEFAULT_SETTINGS = {
  stats: { clients: 150, years: 12, satisfaction: 98, projects: 150 },
  contact: {
    email: 'minnahmat50@gmail.com',
    phone: '+233 549 128 384',
    whatsapp: '233549128384',
    location: 'Agona, Western Region, Ghana',
  },
  trustedLogos: [
    { name: 'KAB Enterprises' },
    { name: 'Sarpong & Co.' },
    { name: 'Mensah Logistics' },
    { name: 'Asante Trading Co.' },
    { name: 'Boateng Medical Centre' },
    { name: 'Mac Data Hub' },
    { name: 'Fortis Pharmacy' },
    { name: 'Agyenim School' },
    { name: 'Antwi Group' },
    { name: 'Yeboah Clinic' },
  ],
};

export async function GET() {
  if (!db.pool) return requireDbResponse();
  try {
    const rows = await db.getSettings();
    const stored = {};
    for (const r of rows) stored[r.key] = r.value;
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...stored });
  } catch (err) {
    console.error('[content] settings error:', err.message);
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Failed to load settings.' }, { status: 500 });
  }
}
