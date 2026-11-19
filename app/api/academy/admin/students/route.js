import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const [applications, smsFailures, programs] = await Promise.all([
      academy.listStudents({ status: 'pending' }),
      academy.listFailedAdmissionSms(),
      academy.listPrograms(),
    ]);
    const programNames = new Map(programs.map((program) => [program.id, program.name]));

    return NextResponse.json({
      applications: applications.map((student) => ({
        ...student,
        programName: programNames.get(student.programId) || 'Program unavailable',
      })),
      smsFailures: smsFailures.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone,
        email: student.email,
        studentId: student.studentId,
        failedChannels: student.failedChannels,
        notificationError: student.notificationError,
        notificationFailedAt: student.notificationFailedAt,
      })),
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admission applications list error:', error);
    return NextResponse.json({ error: 'Could not load admission applications.' }, { status: 500 });
  }
}
