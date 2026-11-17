import { NextResponse } from 'next/server';
const academy = require('../../../../backend/academy-db');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentOnly = searchParams.get('current') === 'true';
    const withEnrollments = searchParams.get('withEnrollments') === 'true';

    if (withEnrollments) {
      const sessions = await academy.listSessions();
      const enrollments = await academy.listEnrollmentsBySession();

      const enrollmentMap = {};
      enrollments.forEach((e) => {
        enrollmentMap[e.session_id] = Number(e.enrollment_count);
      });

      const enriched = sessions.map((s) => ({
        ...s,
        enrollmentCount: enrollmentMap[s.id] || 0,
      }));

      return NextResponse.json(enriched);
    }

    if (currentOnly) {
      const sessions = await academy.listSessions({ currentOnly: true });
      return NextResponse.json(sessions);
    }

    const sessions = await academy.listSessions();
    return NextResponse.json(sessions);
  } catch (err) {
    console.error('Academy sessions error:', err);
    return NextResponse.json(
      { error: 'Could not load sessions.' },
      { status: 500 }
    );
  }
}