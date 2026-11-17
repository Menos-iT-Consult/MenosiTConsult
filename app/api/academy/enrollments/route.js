import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const courseId = searchParams.get('course_id');
    const studentId = searchParams.get('student_id');

    let enrollments;
    if (studentId) {
      enrollments = await academy.listSubmissions({ assignmentId: null, studentId });
      // Actually list enrollments for student
      const { rows } = await academy.q(
        'SELECT * FROM academy_enrollments WHERE student_id = $1 ORDER BY created_at DESC',
        [studentId]
      );
      return NextResponse.json(rows);
    } else if (sessionId) {
      const { rows } = await academy.q(
        'SELECT * FROM academy_enrollments WHERE session_id = $1 ORDER BY created_at DESC',
        [sessionId]
      );
      return NextResponse.json(rows);
    } else if (courseId) {
      const { rows } = await academy.q(
        'SELECT * FROM academy_enrollments WHERE course_id = $1 ORDER BY created_at DESC',
        [courseId]
      );
      return NextResponse.json(rows);
    }

    const { rows } = await academy.q(
      'SELECT * FROM academy_enrollments ORDER BY created_at DESC'
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Academy enrollments error:', err);
    return NextResponse.json(
      { error: 'Could not load enrollments.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const enrollment = await academy.createEnrollment({
      studentId: body.studentId,
      courseId: body.courseId,
      sessionId: body.sessionId,
      status: body.status,
    });
    return NextResponse.json(enrollment);
  } catch (err) {
    console.error('Academy enrollment create error:', err);
    return NextResponse.json(
      { error: 'Could not create enrollment.' },
      { status: 500 }
    );
  }
}