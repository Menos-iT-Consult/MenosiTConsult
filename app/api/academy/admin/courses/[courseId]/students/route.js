import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

export async function GET(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { courseId } = await params;
    const sessionId = new URL(request.url).searchParams.get('sessionId')?.trim() || '';
    if (!courseId || courseId.length > 200 || !sessionId || sessionId.length > 200) {
      return NextResponse.json({ error: 'Choose a valid course and academic session.' }, { status: 400 });
    }

    const [course, sessions] = await Promise.all([
      academy.getCourse(courseId),
      academy.listSessions(),
    ]);
    if (!course) return NextResponse.json({ error: 'Course not found.' }, { status: 404 });
    if (!sessions.some((session) => session.id === sessionId)) {
      return NextResponse.json({ error: 'Academic session not found.' }, { status: 404 });
    }

    const students = await academy.listStudentsForCourseSession(courseId, sessionId);
    return NextResponse.json({
      students: students.map((student) => ({
        id: student.id,
        studentId: student.studentId,
        name: [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' '),
        email: student.email,
        phone: student.phone,
      })),
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admin course roster error:', error);
    return NextResponse.json({ error: 'Could not load enrolled students.' }, { status: 500 });
  }
}
