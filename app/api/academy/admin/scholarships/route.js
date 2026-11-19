import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { validateDiscount } = require('../../../../../lib/academy-finance');
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
    const value = body && typeof body === 'object' ? body : {};
    const name = typeof value.name === 'string' ? value.name.trim() : '';
    const description = typeof value.description === 'string' ? value.description.trim() : '';
    const programId = typeof value.programId === 'string' ? value.programId.trim() : '';
    const discountType = value.discountType;
    const discountValue = validateDiscount(discountType, value.discountValue);
    if (
      !name || name.length > 120 || description.length > 1000 ||
      (value.programId != null && typeof value.programId !== 'string') ||
      (programId && !(await academy.getProgram(programId))) ||
      discountValue == null
    ) {
      return NextResponse.json(
        { error: 'Provide a name, valid program (or all programs), and a positive fixed or percentage discount (up to 100%).' },
        { status: 400 }
      );
    }
    const scholarship = await academy.createScholarship({
      name,
      description,
      programId,
      discountType,
      discountValue,
      createdBy: gate.staff.id,
    });
    return NextResponse.json({ scholarship }, { status: 201 });
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
    if (!body || typeof body.id !== 'string' || typeof body.active !== 'boolean') {
      return NextResponse.json({ error: 'Provide a scholarship ID and active state.' }, { status: 400 });
    }
    const scholarship = await academy.setScholarshipActive(body.id, body.active);
    if (!scholarship) return NextResponse.json({ error: 'Scholarship program not found.' }, { status: 404 });
    return NextResponse.json({ scholarship });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy scholarship update error:', error);
    return NextResponse.json({ error: 'Could not update the scholarship program.' }, { status: 500 });
  }
}
