import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { normalizeAcademySiteSettings } = require('../../../../lib/academy-site-settings');

export async function GET() {
  try {
    const stored = await academy.getAcademySetting('site_contact');
    return NextResponse.json({ settings: normalizeAcademySiteSettings(stored) });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy public site settings error:', error);
    return NextResponse.json({ error: 'Could not load Academy contact settings.' }, { status: 500 });
  }
}
