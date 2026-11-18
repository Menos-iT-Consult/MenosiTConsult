import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

const ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const meetingDate = searchParams.get('meeting_date');
    if (meetingDate && !validDate(meetingDate)) {
      return NextResponse.json({ error: 'Meeting date must be a valid calendar date.' }, { status: 400 });
    }
    if (courseId) {
      const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
      if (courseGate.error) {
        return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
      }
    }
    return NextResponse.json(await academy.listInstructorAttendance(gate.staff.id, {
      courseId,
      sessionId: searchParams.get('session_id'),
      meetingDate,
    }));
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor attendance error:', err);
    return NextResponse.json({ error: 'Could not load attendance.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const courseId = String(body.courseId || '');
    const sessionId = String(body.sessionId || '');
    const meetingDate = String(body.meetingDate || '');
    if (!courseId || !sessionId || !validDate(meetingDate) ||
        !Array.isArray(body.records) || body.records.length > 500) {
      return NextResponse.json({ error: 'Choose a course session and date, and provide up to 500 attendance records.' }, { status: 400 });
    }
    const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
    if (courseGate.error) {
      return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    }
    const seen = new Set();
    for (const record of body.records) {
      if (
        !record || typeof record.studentId !== 'string' || !record.studentId ||
        seen.has(record.studentId) || !ATTENDANCE_STATUSES.has(record.status) ||
        String(record.note || '').length > 500
      ) {
        return NextResponse.json({ error: 'Attendance records must contain unique enrolled students and a valid status.' }, { status: 400 });
      }
      seen.add(record.studentId);
    }
    const saved = await academy.saveInstructorAttendance(gate.staff.id, {
      courseId, sessionId, meetingDate, records: body.records,
    });
    if (!saved) {
      return NextResponse.json({ error: 'Course not found or not assigned to you.' }, { status: 404 });
    }
    return NextResponse.json({ saved: saved.length });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    if (err.code === 'STUDENT_NOT_ENROLLED') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Instructor attendance save error:', err);
    return NextResponse.json({ error: 'Could not save attendance.' }, { status: 500 });
  }
}
