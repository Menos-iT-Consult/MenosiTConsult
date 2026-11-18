import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
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
    return NextResponse.json(await academy.listInstructorSubmissions(gate.staff.id, courseId));
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor submissions error:', err);
    return NextResponse.json({ error: 'Could not load submissions.' }, { status: 500 });
  }
}
