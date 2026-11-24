import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const { sendAndLogAdmissionNotification } = require('../../../../../../../lib/academy-admission-sms');
const { getAcademySiteUrl } = require('../../../../../../../lib/academy-site-url');

function getStudentPortalUrl(request) {
  return new URL('/academy/login', getAcademySiteUrl(request)).toString();
}

export async function POST(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    const student = await academy.getStudent(id);
    if (
      !student ||
      student.status !== 'active' ||
      !student.studentId ||
      !student.mustChangePassword
    ) {
      return NextResponse.json({ error: 'Admitted student not found.' }, { status: 404 });
    }

    const notifications = await sendAndLogAdmissionNotification(student, getStudentPortalUrl(request));
    const delivered = notifications.email.sent && notifications.sms.sent;
    return NextResponse.json(
      {
        sms: { sent: notifications.sms.sent },
        notifications,
        ...(!delivered ? { error: 'One or more email/SMS notifications could not be sent.' } : {}),
      },
      { status: delivered ? 200 : 502 }
    );
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admission SMS retry error:', error);
    return NextResponse.json({ error: 'Could not retry the admission SMS.' }, { status: 500 });
  }
}
