import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (value == null || value === '') return true;
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function PUT(request, { params }) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const plan = {
      sessionId: body.sessionId == null ? null : String(body.sessionId),
      lessonDate: body.lessonDate == null || body.lessonDate === '' ? null : body.lessonDate,
      title: body.title == null ? null : String(body.title).trim(),
      objectives: body.objectives == null ? null : String(body.objectives).trim(),
      notes: body.notes == null ? null : String(body.notes).trim(),
      resources: body.resources == null ? null : String(body.resources).trim(),
    };
    if (
      !validDate(plan.lessonDate) ||
      (plan.title != null && (!plan.title || plan.title.length > 160)) ||
      (plan.objectives != null && plan.objectives.length > 5000) ||
      (plan.notes != null && plan.notes.length > 10000) ||
      (plan.resources != null && plan.resources.length > 5000)
    ) {
      return NextResponse.json({ error: 'Lesson plan fields exceed the allowed limits or contain an invalid date.' }, { status: 400 });
    }
    if (plan.sessionId && !(await academy.listSessions()).some((session) => session.id === plan.sessionId)) {
      return NextResponse.json({ error: 'The selected session was not found.' }, { status: 400 });
    }
    const lesson = await academy.updateInstructorLessonPlan(gate.staff.id, id, plan);
    if (!lesson) {
      return NextResponse.json({ error: 'Lesson plan not found or not in an assigned course.' }, { status: 404 });
    }
    return NextResponse.json(lesson);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor lesson plan update error:', err);
    return NextResponse.json({ error: 'Could not update lesson plan.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const deleted = await academy.deleteInstructorLessonPlan(gate.staff.id, id);
    if (!deleted) {
      return NextResponse.json({ error: 'Lesson plan not found or not in an assigned course.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor lesson plan delete error:', err);
    return NextResponse.json({ error: 'Could not delete lesson plan.' }, { status: 500 });
  }
}
