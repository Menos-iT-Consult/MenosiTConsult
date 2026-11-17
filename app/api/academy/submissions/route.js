import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignment_id');
    const studentId = searchParams.get('student_id');

    let submissions;
    if (studentId) {
      const { rows } = await academy.q(
        'SELECT * FROM academy_submissions WHERE student_id = $1 ORDER BY submitted_at DESC',
        [studentId]
      );
      return NextResponse.json(rows);
    } else if (assignmentId) {
      const { rows } = await academy.q(
        'SELECT * FROM academy_submissions WHERE assignment_id = $1 ORDER BY submitted_at DESC',
        [assignmentId]
      );
      return NextResponse.json(rows);
    }

    const { rows } = await academy.q(
      'SELECT * FROM academy_submissions ORDER BY submitted_at DESC'
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Academy submissions error:', err);
    return NextResponse.json(
      { error: 'Could not load submissions.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const submission = await academy.createSubmission({
      assignmentId: body.assignmentId,
      studentId: body.studentId,
      text: body.text,
      file: body.file,
    });
    return NextResponse.json(submission);
  } catch (err) {
    console.error('Academy submission create error:', err);
    return NextResponse.json(
      { error: 'Could not create submission.' },
      { status: 500 }
    );
  }
}