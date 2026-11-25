import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');
const staffAuth = require('../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');
const { validateTimetableEntry } = require('../../../../lib/academy-timetable-validation');
const {
  sendStudentNotifications,
  summarizeStudentNotifications,
} = require('../../../../lib/academy-notifications');

async function notifySchedule(students, timetable, course, type, action) {
  const day = timetable.day_of_week || 'TBA';
  const time = [timetable.start_time, timetable.end_time].filter(Boolean).join('–') || 'TBA';
  return summarizeStudentNotifications(await sendStudentNotifications(students, {
    type,
    subject: `MITA Academy class schedule ${action}: ${course?.title || 'course'}`,
    emailMessage: `The class schedule for ${course?.title || 'your course'} has been ${action}.\n\n${action === 'cancelled' ? 'The scheduled class has been cancelled.' : `${day}, ${time}${timetable.venue ? ` at ${timetable.venue}` : ''}.`}`,
    smsMessage: action === 'cancelled'
      ? `MITA Academy: The ${course?.title || 'course'} class scheduled for ${day} at ${time} has been cancelled.`
      : `MITA Academy schedule ${action}: ${course?.title || 'course'}, ${day} ${time}${timetable.venue ? ` at ${timetable.venue}` : ''}.`,
  }));
}

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
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
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy timetable error:', err);
    return NextResponse.json(
      { error: 'Could not load timetable.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const validation = validateTimetableEntry(body);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const [sessions, selectedCourse] = await Promise.all([
      academy.listSessions(),
      academy.getCourse(validation.entry.courseId),
    ]);
    if (!sessions.some((session) => session.id === validation.entry.sessionId) || !selectedCourse) {
      return NextResponse.json({ error: 'Choose an existing session and course.' }, { status: 400 });
    }
    const timetable = await academy.createTimetable({
      ...validation.entry,
      createdBy: gate.staff.id,
    });
    const [students, course] = await Promise.all([
      academy.listStudentsForCourseSession(timetable.course_id, timetable.session_id),
      academy.getCourse(timetable.course_id),
    ]);
    const notifications = await notifySchedule(students, timetable, course, 'class_schedule_created', 'created');
    return NextResponse.json({ ...timetable, notifications });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy timetable create error:', err);
    return NextResponse.json(
      { error: 'Could not create timetable entry.' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'A timetable entry ID is required.' }, { status: 400 });
    }
    const validation = validateTimetableEntry(body);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const [sessions, selectedCourse] = await Promise.all([
      academy.listSessions(),
      academy.getCourse(validation.entry.courseId),
    ]);
    if (!sessions.some((session) => session.id === validation.entry.sessionId) || !selectedCourse) {
      return NextResponse.json({ error: 'Choose an existing session and course.' }, { status: 400 });
    }
    const existing = await academy.getTimetable(body.id);
    if (!existing) return NextResponse.json({ error: 'Timetable entry not found.' }, { status: 404 });
    const updated = await academy.updateTimetable(body.id, validation.entry);
    const audiences = await Promise.all([
      academy.listStudentsForCourseSession(existing.course_id, existing.session_id),
      academy.listStudentsForCourseSession(updated.course_id, updated.session_id),
    ]);
    const students = [...new Map(audiences.flat().map((student) => [student.id, student])).values()];
    const course = await academy.getCourse(updated.course_id);
    const notifications = await notifySchedule(students, updated, course, 'class_schedule_updated', 'updated');
    return NextResponse.json({ ...updated, notifications });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy timetable update error:', err);
    return NextResponse.json({ error: 'Could not update timetable entry.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'A timetable entry ID is required.' }, { status: 400 });
    const timetable = await academy.getTimetable(id);
    if (!timetable) return NextResponse.json({ error: 'Timetable entry not found.' }, { status: 404 });
    const [students, course] = await Promise.all([
      academy.listStudentsForCourseSession(timetable.course_id, timetable.session_id),
      academy.getCourse(timetable.course_id),
    ]);
    await academy.deleteTimetable(id);
    const notifications = await notifySchedule(students, timetable, course, 'class_schedule_cancelled', 'cancelled');
    return NextResponse.json({ success: true, notifications });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy timetable cancellation error:', err);
    return NextResponse.json({ error: 'Could not cancel timetable entry.' }, { status: 500 });
  }
}