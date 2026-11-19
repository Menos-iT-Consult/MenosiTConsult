import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const {
  sendStudentNotifications,
  summarizeStudentNotifications,
} = require('../../../../../../lib/academy-notifications');
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
    const [students, course] = await Promise.all([
      academy.listStudentsForCourseSession(assignment.courseId, assignment.sessionId),
      academy.getCourse(assignment.courseId),
    ]);
    const due = assignment.dueAt ? new Date(assignment.dueAt).toLocaleString() : 'No deadline set';
    const notifications = summarizeStudentNotifications(await sendStudentNotifications(students, {
      type: 'assignment_updated',
      subject: `Assignment updated: ${assignment.title}`,
      emailMessage: `The assignment "${assignment.title}" in ${course?.title || 'your course'} has been updated.\nDue: ${due}\n\nSign in to the MITA Academy portal to review the current instructions.`,
      smsMessage: `MITA Academy assignment update: ${assignment.title} in ${course?.title || 'your course'}. Due: ${due}.`,
    }));
    return NextResponse.json({ ...assignment, notifications });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor assignment update error:', err);
    return NextResponse.json({ error: 'Could not update assignment.' }, { status: 500 });
  }
}
