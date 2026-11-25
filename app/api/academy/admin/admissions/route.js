import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const {
  ADMISSIONS_SETTING_KEY,
  isAdmissionsOpen,
  validateAdmissionsStatus,
} = require('../../../../../lib/academy-admissions');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const stored = await academy.getAcademySetting(ADMISSIONS_SETTING_KEY);
    return NextResponse.json({ admissionsOpen: isAdmissionsOpen(stored) });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admissions status load error:', error);
    return NextResponse.json({ error: 'Could not load admissions status.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const validation = validateAdmissionsStatus(await request.json().catch(() => null));
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const saved = await academy.setAcademySetting(ADMISSIONS_SETTING_KEY, validation.admissionsOpen);
    return NextResponse.json({ success: true, admissionsOpen: saved.value });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admissions status save error:', error);
    return NextResponse.json({ error: 'Could not update admissions status.' }, { status: 500 });
  }
}
