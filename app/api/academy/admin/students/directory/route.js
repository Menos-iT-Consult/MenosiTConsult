import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

const PAGE_SIZE = 50;

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const smsStatus = searchParams.get('sms_status') || '';
    const programId = searchParams.get('program_id') || '';
    const sessionId = searchParams.get('session_id') || '';
    const search = (searchParams.get('q') || '').trim();
    const page = Number(searchParams.get('page') || 0);

    if (status && !['pending', 'active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Invalid account status filter.' }, { status: 400 });
    }
    if (smsStatus && !['sent', 'failed', 'not_sent'].includes(smsStatus)) {
      return NextResponse.json({ error: 'Invalid SMS status filter.' }, { status: 400 });
    }
    if (search.length > 100 || !Number.isSafeInteger(page) || page < 0 || page > 20000) {
      return NextResponse.json({ error: 'Invalid directory filters.' }, { status: 400 });
    }

    const [directory, programs, sessions] = await Promise.all([
      academy.listAdminStudents({
        status,
        programId,
        sessionId,
        smsStatus,
        search,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
      academy.listPrograms(),
      academy.listSessions(),
    ]);

    return NextResponse.json({
      students: directory.students,
      total: directory.total,
      page,
      pageSize: PAGE_SIZE,
      programs: programs.map(({ id, name }) => ({ id, name })),
      sessions: sessions.map(({ id, name }) => ({ id, name })),
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student directory error:', error);
    return NextResponse.json({ error: 'Could not load the student directory.' }, { status: 500 });
  }
}
