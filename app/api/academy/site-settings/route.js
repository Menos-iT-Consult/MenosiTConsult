import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { normalizeAcademySiteSettings } = require('../../../../lib/academy-site-settings');
const { ADMISSIONS_SETTING_KEY, isAdmissionsOpen } = require('../../../../lib/academy-admissions');

export async function GET() {
  try {
    const [stored, admissionsOpen] = await Promise.all([
      academy.getAcademySetting('site_contact'),
      academy.getAcademySetting(ADMISSIONS_SETTING_KEY),
    ]);
    return NextResponse.json({
      settings: normalizeAcademySiteSettings(stored),
      admissionsOpen: isAdmissionsOpen(admissionsOpen),
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy public site settings error:', error);
    return NextResponse.json({ error: 'Could not load Academy contact settings.' }, { status: 500 });
  }
}
