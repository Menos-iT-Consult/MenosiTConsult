import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { normalizeScholarshipInput } = require('../../../../../lib/academy-finance');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const scholarships = await academy.listScholarships();
    return NextResponse.json({ scholarships });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy scholarships error:', error);
    return NextResponse.json({ error: 'Could not load scholarship programs.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const scholarship = normalizeScholarshipInput(body);
    if (!scholarship || (scholarship.programId && !(await academy.getProgram(scholarship.programId)))) {
      return NextResponse.json(
        { error: 'Provide a name, valid program (or all programs), and a positive fixed or percentage discount (up to 100%).' },
        { status: 400 }
      );
    }
    const created = await academy.createScholarship({
      ...scholarship,
      createdBy: gate.staff.id,
    });
    return NextResponse.json({ scholarship: created }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy scholarship create error:', error);
    return NextResponse.json({ error: 'Could not create the scholarship program.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Provide a valid scholarship ID.' }, { status: 400 });
    }
    if (typeof body.active === 'boolean' &&
        Object.keys(body).every((key) => key === 'id' || key === 'active')) {
      const scholarship = await academy.setScholarshipActive(body.id, body.active);
      if (!scholarship) return NextResponse.json({ error: 'Scholarship program not found.' }, { status: 404 });
      return NextResponse.json({ scholarship });
    }

    const updates = normalizeScholarshipInput(body);
    if (!updates || (updates.programId && !(await academy.getProgram(updates.programId)))) {
      return NextResponse.json(
        { error: 'Provide a name, valid program (or all programs), and a positive fixed or percentage discount (up to 100%).' },
        { status: 400 }
      );
    }
    const updated = await academy.updateScholarship(body.id, updates);
    if (!updated) return NextResponse.json({ error: 'Scholarship program not found.' }, { status: 404 });
    const scholarship = await academy.getScholarship(body.id);
    return NextResponse.json({ scholarship });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === 'SCHOLARSHIP_SCOPE_CONFLICT') {
      return NextResponse.json(
        { error: 'This program scope excludes students who have an award or pending application. Change it to All programs or resolve those records first.' },
        { status: 409 }
      );
    }
    console.error('Academy scholarship update error:', error);
    return NextResponse.json({ error: 'Could not update the scholarship program.' }, { status: 500 });
  }
}
