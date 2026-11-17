import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const courseId = searchParams.get('course_id');

    let exams;
    if (sessionId) {
      exams = await academy.listExams({ sessionId });
    } else if (courseId) {
      exams = await academy.listExams({ courseId });
    } else {
      exams = await academy.listExams();
    }
    return NextResponse.json(exams);
  } catch (err) {
    console.error('Academy exams error:', err);
    return NextResponse.json(
      { error: 'Could not load exams.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const exam = await academy.createExam({
      sessionId: body.sessionId,
      courseId: body.courseId,
      title: body.title,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      venue: body.venue,
      createdBy: body.createdBy,
    });
    return NextResponse.json(exam);
  } catch (err) {
    console.error('Academy exam create error:', err);
    return NextResponse.json(
      { error: 'Could not create exam.' },
      { status: 500 }
    );
  }
}