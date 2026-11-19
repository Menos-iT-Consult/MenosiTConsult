import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');
const staffAuth = require('../../../../lib/academy-staff');
const {
  sendStudentNotifications,
  summarizeStudentNotifications,
} = require('../../../../lib/academy-notifications');

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
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const exam = await academy.createExam({
      sessionId: body.sessionId,
      courseId: body.courseId,
      title: body.title,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      venue: body.venue,
      createdBy: gate.staff.id,
    });
    const [students, course] = await Promise.all([
      academy.listStudentsForCourseSession(body.courseId, body.sessionId),
      academy.getCourse(body.courseId),
    ]);
    const dateTime = [body.date, body.startTime].filter(Boolean).join(' at ') || 'Date and time to be announced';
    const deliveries = await sendStudentNotifications(students, {
      type: 'exam_scheduled',
      subject: `MITA Academy exam scheduled: ${body.title}`,
      emailMessage: `An exam has been scheduled for ${course?.title || 'your course'}.\n\n${body.title}\nDate and time: ${dateTime}${body.venue ? `\nVenue: ${body.venue}` : ''}.`,
      smsMessage: `MITA Academy exam: ${body.title} for ${course?.title || 'your course'} is scheduled ${dateTime}${body.venue ? ` at ${body.venue}` : ''}.`,
    });
    return NextResponse.json({
      ...exam,
      notifications: summarizeStudentNotifications(deliveries),
    }, { status: 201 });
  } catch (err) {
    console.error('Academy exam create error:', err);
    return NextResponse.json(
      { error: 'Could not create exam.' },
      { status: 500 }
    );
  }
}