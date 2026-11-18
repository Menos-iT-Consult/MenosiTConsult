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
    const assignmentId = searchParams.get('assignment_id');
    let submissions;

    if (auth.getStaffId(request)) {
      const gate = await staffAuth.requireInstructor(request);
      if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
      if (courseId) {
        const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
        if (courseGate.error) {
          return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
        }
      }
      submissions = await academy.listInstructorSubmissions(gate.staff.id, courseId);
    } else {
      const student = await activeStudent(request);
      if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
      submissions = await academy.listSubmissions({ studentId: student.id });
    }

    if (assignmentId) submissions = submissions.filter((submission) => submission.assignmentId === assignmentId);
    return NextResponse.json(submissions);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy submissions error:', err);
    return NextResponse.json({ error: 'Could not load submissions.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const student = await activeStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const assignmentId = String(body.assignmentId || '');
    const text = String(body.text || '').trim();
    const file = String(body.file || '').trim();
    if (!assignmentId || text.length > 20000 || file.length > 2000000) {
      return NextResponse.json({ error: 'Provide an assignment and valid submission content.' }, { status: 400 });
    }
    const submission = await academy.createStudentSubmission(student.id, { assignmentId, text, file });
    if (!submission) {
      return NextResponse.json({ error: 'Assignment not found or you are not enrolled in its course session.' }, { status: 404 });
    }
    return NextResponse.json(submission, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    if (err.code === '23505') {
      return NextResponse.json({ error: 'A submission already exists for this assignment.' }, { status: 409 });
    }
    console.error('Academy submission create error:', err);
    return NextResponse.json({ error: 'Could not create submission.' }, { status: 500 });
  }
}
