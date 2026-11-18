import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

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
    return NextResponse.json(await academy.listInstructorGradebook(gate.staff.id, courseId));
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor gradebook error:', err);
    return NextResponse.json({ error: 'Could not load the gradebook.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const enrollmentId = String(body.enrollmentId || '');
    const ca = Number(body.ca);
    const exam = Number(body.exam);
    if (!enrollmentId || !Number.isFinite(ca) || !Number.isFinite(exam) ||
        ca < 0 || ca > 100 || exam < 0 || exam > 100) {
      return NextResponse.json({ error: 'Enrollment ID and valid CA/exam scores from 0 to 100 are required.' }, { status: 400 });
    }
    const grade = await academy.upsertInstructorGrade(gate.staff.id, { enrollmentId, ca, exam });
    if (!grade) {
      return NextResponse.json({ error: 'Enrollment not found or not in an assigned course.' }, { status: 404 });
    }
    return NextResponse.json(grade);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor grade update error:', err);
    return NextResponse.json({ error: 'Could not save grade.' }, { status: 500 });
  }
}
