import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

async function getAdministrator(request) {
  const staffId = auth.getStaffId(request);
  if (!staffId) return { status: 401, error: 'Not signed in.' };

  const staff = await academy.getStaff(staffId);
  if (!staff || staff.status !== 'active') {
    return { status: 401, error: 'Not signed in.' };
  }
  if (staff.role !== 'admin') {
    return { status: 403, error: 'Only academy administrators can manage announcements.' };
  }
  return { staff };
}

export async function GET(request) {
  try {
    const administrator = await getAdministrator(request);
    if (administrator.error) {
      return NextResponse.json(
        { error: administrator.error },
        { status: administrator.status }
      );
    }
    const [announcements, sessions] = await Promise.all([
      academy.listAnnouncements(),
      academy.listSessions(),
    ]);
    return NextResponse.json({ announcements, sessions });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy announcements list error:', err);
    return NextResponse.json(
      { error: 'Could not load announcements.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const administrator = await getAdministrator(request);
    if (administrator.error) {
      return NextResponse.json(
        { error: administrator.error },
        { status: administrator.status }
      );
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const message = String(body.body || '').trim();
    const sessionId = String(body.sessionId || '').trim();

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Announcement title and message are required.' },
        { status: 400 }
      );
    }
    if (title.length > 160 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Title must be 160 characters or fewer and message 5,000 characters or fewer.' },
        { status: 400 }
      );
    }
    if (sessionId && !(await academy.listSessions()).some((session) => session.id === sessionId)) {
      return NextResponse.json(
        { error: 'The selected session was not found.' },
        { status: 400 }
      );
    }

    const announcement = await academy.createAnnouncement({
      title,
      body: message,
      sessionId,
      createdBy: administrator.staff.id,
      published: true,
    });
    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy announcement create error:', err);
    return NextResponse.json(
      { error: 'Could not create announcement.' },
      { status: 500 }
    );
  }
}
