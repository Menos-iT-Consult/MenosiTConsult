import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollment_id');
    const studentId = searchParams.get('student_id');

    let grades;
    if (enrollmentId) {
      const grade = await academy.getGrade(enrollmentId);
      if (grade) return NextResponse.json(grade);
      // Calculate on the fly if not stored
      const calc = await academy.calculateGrade(enrollmentId);
      return NextResponse.json(calc);
    } else if (studentId) {
      // Get all enrollments for student, then grades
      const { rows: enrollments } = await academy.q(
        'SELECT * FROM academy_enrollments WHERE student_id = $1 ORDER BY created_at DESC',
        [studentId]
      );
      const gradesList = [];
      for (const e of enrollments) {
        const g = await academy.getGrade(e.id);
        if (g) gradesList.push(g);
        else {
          const cg = await academy.calculateGrade(e.id);
          gradesList.push(cg);
        }
      }
      return NextResponse.json(gradesList);
    }

    const { rows } = await academy.q('SELECT * FROM academy_grades ORDER BY updated_at DESC');
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Academy grades error:', err);
    return NextResponse.json(
      { error: 'Could not load grades.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const grade = await academy.upsertGrade({
      enrollmentId: body.enrollmentId,
      ca: body.ca,
      exam: body.exam,
      updatedBy: body.updatedBy,
    });
    return NextResponse.json(grade);
  } catch (err) {
    console.error('Academy grade upsert error:', err);
    return NextResponse.json(
      { error: 'Could not upsert grade.' },
      { status: 500 }
    );
  }
}