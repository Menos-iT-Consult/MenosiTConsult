import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id') || '';
    const sessionId = searchParams.get('session_id') || '';
    if (courseId.length > 200 || sessionId.length > 200) {
      return NextResponse.json({ error: 'Invalid attendance filter.' }, { status: 400 });
    }

    const attendance = await academy.listStudentAttendance(student.id, { courseId, sessionId });
    return NextResponse.json({ attendance });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student attendance error:', error);
    return NextResponse.json({ error: 'Could not load attendance history.' }, { status: 500 });
  }
}
