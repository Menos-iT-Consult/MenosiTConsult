import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function PATCH(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    if (
      typeof body?.lessonId !== 'string' || !body.lessonId.trim() ||
      body.lessonId.length > 200 || typeof body.completed !== 'boolean'
    ) {
      return NextResponse.json({ error: 'A lesson and completion status are required.' }, { status: 400 });
    }

    const result = await academy.setStudentLessonProgress(
      student.id,
      body.lessonId.trim(),
      body.completed
    );
    if (!result) {
      return NextResponse.json({ error: 'Lesson not found in your enrolled courses.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, completed: body.completed });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student lesson progress error:', error);
    return NextResponse.json({ error: 'Could not update lesson progress.' }, { status: 500 });
  }
}
