import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const { sendAndLogAdmissionNotification } = require('../../../../../../../lib/academy-admission-sms');

function getStudentPortalUrl(request) {
  const siteUrl = process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    new URL(request.url).origin;
  return new URL('/academy/login', siteUrl).toString();
}

export async function POST(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    const applicant = await academy.getStudent(id);
    if (!applicant) return NextResponse.json({ error: 'Application not found.' }, { status: 404 });
    if (applicant.status !== 'pending') {
      return NextResponse.json({ error: 'This application is no longer pending.' }, { status: 409 });
    }
    const portalUrl = getStudentPortalUrl(request);
    const student = await academy.admitStudent(id);
    if (!student) {
      return NextResponse.json({ error: 'This application is no longer pending.' }, { status: 409 });
    }

    const notifications = await sendAndLogAdmissionNotification(student, portalUrl);
    const delivered = notifications.email.sent && notifications.sms.sent;
    return NextResponse.json(
      {
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          studentId: student.studentId,
        },
        sms: { sent: notifications.sms.sent },
        notifications,
        ...(!delivered ? { error: 'Admission approved, but one or more email/SMS notifications could not be sent.' } : {}),
      },
      { status: delivered ? 200 : 502 }
    );
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === 'ADMISSION_PROGRAM_REQUIRED' || error.code === 'ADMISSION_PROGRAM_CODE_INVALID') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Academy student admission error:', error);
    return NextResponse.json({ error: 'Could not approve this admission.' }, { status: 500 });
  }
}
