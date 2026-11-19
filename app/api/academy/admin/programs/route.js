import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { normalizeProgramInput } = require('../../../../../lib/academy-finance');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const programs = await academy.listPrograms();
    return NextResponse.json({ programs });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admin programs error:', error);
    return NextResponse.json({ error: 'Could not load Academy programs.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const program = normalizeProgramInput(body && typeof body === 'object' && !Array.isArray(body) ? body : {});
    if (!program) {
      return NextResponse.json(
        { error: 'Provide a program name, valid code, duration (1–20 semesters), and fee per semester in GHS.' },
        { status: 400 }
      );
    }
    if ((await academy.listPrograms()).some((item) => item.code.toLowerCase() === program.code.toLowerCase())) {
      return NextResponse.json({ error: 'A program already uses this code.' }, { status: 409 });
    }
    const created = await academy.createProgram(program);
    return NextResponse.json({ program: created }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A program already uses this code.' }, { status: 409 });
    }
    console.error('Academy admin program create error:', error);
    return NextResponse.json({ error: 'Could not create the Academy program.' }, { status: 500 });
  }
}
