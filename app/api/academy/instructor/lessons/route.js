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

export async function GET(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const courseId = new URL(request.url).searchParams.get('course_id');
    if (!courseId) return NextResponse.json({ error: 'Course ID is required.' }, { status: 400 });
    const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
    if (courseGate.error) {
      return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    }
    return NextResponse.json(await academy.listInstructorLessonPlans(gate.staff.id, courseId));
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor lesson plans error:', err);
    return NextResponse.json({ error: 'Could not load lesson plans.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const courseId = String(body.courseId || '');
    const title = String(body.title || '').trim();
    const objectives = String(body.objectives || '').trim();
    const notes = String(body.notes || '').trim();
    const resources = String(body.resources || '').trim();
    const lessonDate = body.lessonDate || null;
    if (!courseId || !title || title.length > 160 || !validDate(lessonDate) ||
        objectives.length > 5000 || notes.length > 10000 || resources.length > 5000) {
      return NextResponse.json({ error: 'Provide a title (160 characters or fewer), valid date, and lesson details within the allowed limits.' }, { status: 400 });
    }
    const sessionId = String(body.sessionId || '');
    if (sessionId && !(await academy.listSessions()).some((session) => session.id === sessionId)) {
      return NextResponse.json({ error: 'The selected session was not found.' }, { status: 400 });
    }
    const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
    if (courseGate.error) {
      return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    }
    const lesson = await academy.createInstructorLessonPlan(gate.staff.id, {
      courseId,
      sessionId,
      lessonDate,
      title,
      objectives,
      notes,
      resources,
    });
    if (!lesson) {
      return NextResponse.json({ error: 'Course not found or not assigned to you.' }, { status: 404 });
    }
    return NextResponse.json(lesson, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor lesson plan create error:', err);
    return NextResponse.json({ error: 'Could not save lesson plan.' }, { status: 500 });
  }
}
