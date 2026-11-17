import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const courseId = searchParams.get('course_id');

    let assignments;
    if (sessionId) {
      assignments = await academy.listAssignments({ sessionId });
    } else if (courseId) {
      assignments = await academy.listAssignments({ courseId });
    } else {
      assignments = await academy.listAssignments();
    }
    return NextResponse.json(assignments);
  } catch (err) {
    console.error('Academy assignments error:', err);
    return NextResponse.json(
      { error: 'Could not load assignments.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const assignment = await academy.createAssignment({
      courseId: body.courseId,
      sessionId: body.sessionId,
      title: body.title,
      instructions: body.instructions,
      dueAt: body.dueAt,
      maxScore: body.maxScore,
    });
    return NextResponse.json(assignment);
  } catch (err) {
    console.error('Academy assignment create error:', err);
    return NextResponse.json(
      { error: 'Could not create assignment.' },
      { status: 500 }
    );
  }
}