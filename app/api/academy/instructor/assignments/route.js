import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const {
  sendStudentNotifications,
  summarizeStudentNotifications,
} = require('../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    if (courseId) {
      const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
      if (courseGate.error) {
        return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
      }
    }
    return NextResponse.json(await academy.listInstructorAssignments(gate.staff.id, courseId));
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor assignments error:', err);
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
    const instructions = String(body.instructions || '').trim();
    const sessionId = String(body.sessionId || '').trim();
    const maxScore = Number(body.maxScore);
    const dueAt = body.dueAt ? new Date(body.dueAt) : null;
    if (!title || title.length > 160 || instructions.length > 10000 ||
        !sessionId || !Number.isFinite(maxScore) || maxScore <= 0 ||
        (body.dueAt && Number.isNaN(dueAt.getTime()))) {
      return NextResponse.json(
        { error: 'Provide a title, session, valid deadline, and positive maximum score.' },
        { status: 400 }
      );
    }
    if (!(await academy.listSessions()).some((session) => session.id === sessionId)) {
      return NextResponse.json({ error: 'The selected session was not found.' }, { status: 400 });
    }
    const assignment = await academy.createInstructorAssignment(gate.staff.id, {
      courseId,
      sessionId,
      title,
      instructions,
      dueAt: dueAt ? dueAt.toISOString() : null,
      maxScore,
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Course not found or not assigned to you.' }, { status: 404 });
    }
    const [students, course] = await Promise.all([
      academy.listStudentsForCourseSession(assignment.courseId, assignment.sessionId),
      academy.getCourse(assignment.courseId),
    ]);
    const due = assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : 'No deadline set';
    const notifications = summarizeStudentNotifications(await sendStudentNotifications(students, {
      type: 'assignment_posted',
      subject: `New assignment: ${assignment.title}`,
      emailMessage: `A new assignment is available in ${course?.title || 'your course'}.\n\n${assignment.title}\nDue: ${due}\n\nSign in to the MITA Academy portal to read the instructions and submit your work.`,
      smsMessage: `New MITA Academy assignment in ${course?.title || 'your course'}: ${assignment.title}. Due: ${due}.`,
    }));
    return NextResponse.json({ ...assignment, notifications }, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor assignment create error:', err);
    return NextResponse.json({ error: 'Could not create assignment.' }, { status: 500 });
  }
}
