import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

export async function PUT(request, { params }) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const assignment = await academy.updateInstructorAssignment(gate.staff.id, id, {
      title: body.title == null ? null : String(body.title).trim(),
      instructions: body.instructions == null ? null : String(body.instructions).trim(),
      dueAt: body.dueAt == null ? null : body.dueAt,
      maxScore: body.maxScore == null ? null : Number(body.maxScore),
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found or not in an assigned course.' }, { status: 404 });
    }
    return NextResponse.json(assignment);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor assignment update error:', err);
    return NextResponse.json({ error: 'Could not update assignment.' }, { status: 500 });
  }
}
