import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const auth = require('../../../../lib/academy-auth');
const staffAuth = require('../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');

async function activeStudent(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return null;
  const student = await academy.getStudent(studentId);
  return student && student.status === 'active' ? student : null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const sessionId = searchParams.get('session_id');
    let assignments;

    if (auth.getStaffId(request)) {
      const gate = await staffAuth.requireInstructor(request);
      if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
      if (courseId) {
        const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
        if (courseGate.error) {
          return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
        }
      }
      assignments = await academy.listInstructorAssignments(gate.staff.id, courseId);
    } else {
      const student = await activeStudent(request);
      if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
      assignments = await academy.listStudentAssignments(student.id);
      if (courseId) assignments = assignments.filter((item) => item.courseId === courseId);
    }

    if (sessionId) assignments = assignments.filter((item) => item.sessionId === sessionId);
    return NextResponse.json(assignments);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy assignments error:', err);
    return NextResponse.json({ error: 'Could not load assignments.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const courseId = String(body.courseId || '');
    const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
    if (courseGate.error) {
      return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    }
    const title = String(body.title || '').trim();
    const sessionId = String(body.sessionId || '');
    const maxScore = Number(body.maxScore);
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    if (!title || title.length > 160 || !sessionId || !Number.isFinite(maxScore) || maxScore <= 0 ||
        String(body.instructions || '').length > 10000 ||
        (body.dueAt && Number.isNaN(dueAt.getTime()))) {
      return NextResponse.json({ error: 'Provide a title, session, valid deadline, and positive maximum score.' }, { status: 400 });
    }
    const assignment = await academy.createInstructorAssignment(gate.staff.id, {
      courseId,
      sessionId,
      title,
      instructions: String(body.instructions || '').trim(),
      dueAt: dueAt ? dueAt.toISOString() : null,
      maxScore,
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Course not found or not assigned to you.' }, { status: 404 });
    }
    return NextResponse.json(assignment, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy assignment create error:', err);
    return NextResponse.json({ error: 'Could not create assignment.' }, { status: 500 });
  }
}
