import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const {
  normalizeAcademySiteSettings,
  validateAcademySiteSettings,
} = require('../../../../../lib/academy-site-settings');

async function getAdministrator(request) {
  const staffId = auth.getStaffId(request);
  if (!staffId) return { status: 401, error: 'Not signed in.' };

  const staff = await academy.getStaff(staffId);
  if (!staff || staff.status !== 'active') {
    return { status: 401, error: 'Not signed in.' };
  }
  if (staff.role !== 'admin') {
    return { status: 403, error: 'Only Academy administrators can manage site settings.' };
  }
  return { staff };
}

export async function GET(request) {
  try {
    const administrator = await getAdministrator(request);
    if (administrator.error) {
      return NextResponse.json({ error: administrator.error }, { status: administrator.status });
    }

    const stored = await academy.getAcademySetting('site_contact');
    return NextResponse.json({ settings: normalizeAcademySiteSettings(stored) });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy site settings load error:', error);
    return NextResponse.json({ error: 'Could not load Academy site settings.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const administrator = await getAdministrator(request);
    if (administrator.error) {
      return NextResponse.json({ error: administrator.error }, { status: administrator.status });
    }

    const body = await request.json().catch(() => null);
    const result = validateAcademySiteSettings(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const saved = await academy.setAcademySetting('site_contact', result.settings);
    return NextResponse.json({
      success: true,
      settings: normalizeAcademySiteSettings(saved.value),
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy site settings save error:', error);
    return NextResponse.json({ error: 'Could not save Academy site settings.' }, { status: 500 });
  }
}
