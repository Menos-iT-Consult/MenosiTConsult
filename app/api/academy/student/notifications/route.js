import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const unreadCount = await academy.countUnreadStudentPortalNotifications(student.id);
    if (new URL(request.url).searchParams.get('countOnly') === 'true') {
      return NextResponse.json({ unreadCount }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const notifications = await academy.listStudentPortalNotifications(student.id, 200);
    return NextResponse.json({
      notifications,
      unreadCount,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student notifications error:', error);
    return NextResponse.json({ error: 'Could not load notifications.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const body = await request.json().catch(() => null);
    if (body?.all !== true && (typeof body?.id !== 'string' || !body.id.trim() || body.id.length > 200)) {
      return NextResponse.json({ error: 'Choose a notification to mark as read.' }, { status: 400 });
    }
    const updated = await academy.markStudentPortalNotificationRead(student.id, {
      id: body.id?.trim(),
      all: body.all === true,
    });
    if (body.all !== true && !updated) {
      return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student notification update error:', error);
    return NextResponse.json({ error: 'Could not update notifications.' }, { status: 500 });
  }
}
