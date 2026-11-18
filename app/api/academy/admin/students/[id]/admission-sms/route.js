import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const { getMnotifyConfigurationError } = require('../../../../../../../lib/academy-sms');
const { sendAndLogAdmissionSms } = require('../../../../../../../lib/academy-admission-sms');

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

    const configurationError = getMnotifyConfigurationError();
    if (configurationError) {
      return NextResponse.json({ error: configurationError }, { status: 503 });
    }

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

    const sms = await sendAndLogAdmissionSms(student, getStudentPortalUrl(request));
    return NextResponse.json(
      {
        sms: { sent: sms.ok },
        ...(sms.ok ? {} : { error: `The SMS could not be sent: ${sms.error}` }),
      },
      { status: sms.ok ? 200 : 502 }
    );
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admission SMS retry error:', error);
    return NextResponse.json({ error: 'Could not retry the admission SMS.' }, { status: 500 });
  }
}
