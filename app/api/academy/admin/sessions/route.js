import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (!value) return true;
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const startDate = body.startDate || null;
    const endDate = body.endDate || null;
    const isCurrent = body.isCurrent === true;
    if (
      !name || name.length > 120 || !validDate(startDate) || !validDate(endDate) ||
      (startDate && endDate && startDate > endDate)
    ) {
      return NextResponse.json(
        { error: 'Provide a session name (120 characters or fewer) and valid dates with the end date after the start date.' },
        { status: 400 }
      );
    }
    const session = await academy.createAcademySession({ name, startDate, endDate, isCurrent });
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy admin session create error:', err);
    return NextResponse.json({ error: 'Could not create Academy session.' }, { status: 500 });
  }
}
