import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const auth = require('../../../../lib/academy-auth');
const staffAuth = require('../../../../lib/academy-staff');
const { validateStudentSubmission } = require('../../../../lib/academy-submissions');
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
    if (!assignmentId) {
      return NextResponse.json({ error: 'Provide an assignment and valid submission content.' }, { status: 400 });
    }
    const validationError = validateStudentSubmission(text, file);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const result = await academy.saveStudentSubmission(student.id, { assignmentId, text, file });
    if (result.error === 'not_enrolled') {
      return NextResponse.json(
        { error: 'Assignment not found or you are not enrolled in its course session.' },
        { status: 404 }
      );
    }
    if (result.error === 'deadline_passed') {
      return NextResponse.json({ error: 'The assignment deadline has passed.' }, { status: 409 });
    }
    if (result.error === 'already_graded') {
      return NextResponse.json({ error: 'This submission has been graded and can no longer be changed.' }, { status: 409 });
    }
    if (result.error || !result.submission) {
      return NextResponse.json({ error: 'This assignment can no longer accept submissions.' }, { status: 409 });
    }
    return NextResponse.json(result.submission, { status: result.created ? 201 : 200 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy submission create error:', err);
    return NextResponse.json({ error: 'Could not create submission.' }, { status: 500 });
  }
}
