import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { normalizeProgramInput } = require('../../../../../../lib/academy-finance');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

export async function PATCH(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const program = normalizeProgramInput(
      body && typeof body === 'object' && !Array.isArray(body) ? body : {},
      { requirePublished: true }
    );
    if (!program) {
      return NextResponse.json({ error: 'Provide valid program details and a GHS fee per semester.' }, { status: 400 });
    }
    const duplicate = (await academy.listPrograms()).some(
      (item) => item.id !== id && item.code.toLowerCase() === program.code.toLowerCase()
    );
    if (duplicate) return NextResponse.json({ error: 'A program already uses this code.' }, { status: 409 });
    const updated = await academy.updateProgram(id, program);
    if (!updated) return NextResponse.json({ error: 'Program not found.' }, { status: 404 });
    return NextResponse.json({ program: updated });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A program already uses this code.' }, { status: 409 });
    }
    console.error('Academy admin program update error:', error);
    return NextResponse.json({ error: 'Could not update the Academy program.' }, { status: 500 });
  }
}
