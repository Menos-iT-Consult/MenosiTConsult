import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

export async function GET(request, { params }) {
  try {
    const { courseId } = await params;
    const gate = await staffAuth.requireAssignedCourse(request, courseId);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const [roster, assignments, sessions] = await Promise.all([
      academy.listInstructorRoster(courseId, gate.staff.id),
      academy.listInstructorAssignments(gate.staff.id, courseId),
      academy.listSessions(),
    ]);
    return NextResponse.json({ course: gate.course, roster, assignments, sessions });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor course workspace error:', err);
    return NextResponse.json({ error: 'Could not load this course workspace.' }, { status: 500 });
  }
}
