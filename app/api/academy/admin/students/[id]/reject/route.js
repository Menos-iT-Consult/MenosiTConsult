import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { sendStudentNotification } = require('../../../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

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

    const student = await academy.setStudentStatus(id, 'rejected');
    if (!student) return NextResponse.json({ error: 'This application is no longer pending.' }, { status: 409 });
    const notifications = await sendStudentNotification(student, {
      type: 'admission_declined',
      subject: 'MITA Academy admission application update',
      message: `The MITA Academy admissions team has reviewed your application and is unable to offer admission at this time. If you have questions, please contact the Academy.`,
    });
    return NextResponse.json({ student, notifications });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student rejection error:', error);
    return NextResponse.json({ error: 'Could not decline this application.' }, { status: 500 });
  }
}
