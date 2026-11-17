import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const courseId = searchParams.get('course_id');

    let timetable;
    if (sessionId) {
      timetable = await academy.listTimetable({ sessionId });
    } else if (courseId) {
      timetable = await academy.listTimetable({ courseId });
    } else {
      timetable = await academy.listTimetable();
    }
    return NextResponse.json(timetable);
  } catch (err) {
    console.error('Academy timetable error:', err);
    return NextResponse.json(
      { error: 'Could not load timetable.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const timetable = await academy.createTimetable({
      sessionId: body.sessionId,
      courseId: body.courseId,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      venue: body.venue,
      createdBy: body.createdBy,
    });
    return NextResponse.json(timetable);
  } catch (err) {
    console.error('Academy timetable create error:', err);
    return NextResponse.json(
      { error: 'Could not create timetable entry.' },
      { status: 500 }
    );
  }
}