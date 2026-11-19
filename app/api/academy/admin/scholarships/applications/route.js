import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { sendStudentNotification } = require('../../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const applications = await academy.listScholarshipApplications({ status: 'pending' });
    return NextResponse.json({ applications }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy scholarship application list error:', error);
    return NextResponse.json({ error: 'Could not load scholarship applications.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const body = await request.json().catch(() => null);
    const reviewNote = typeof body?.reviewNote === 'string' ? body.reviewNote.trim() : '';
    if (
      !body || typeof body !== 'object' || Array.isArray(body) ||
      typeof body.applicationId !== 'string' ||
      !['approved', 'rejected'].includes(body.status) ||
      reviewNote.length > 1000
    ) {
      return NextResponse.json({ error: 'Provide an application ID and choose approve or reject.' }, { status: 400 });
    }

    const application = await academy.reviewScholarshipApplication(
      body.applicationId,
      body.status,
      gate.staff.id,
      reviewNote
    );
    if (!application) return NextResponse.json({ error: 'Scholarship application not found.' }, { status: 404 });
    const student = await academy.getStudent(application.studentId);
    const isApproved = application.status === 'approved';
    const notifications = student
      ? await sendStudentNotification(student, {
          type: `scholarship_application_${application.status}`,
          subject: `MITA Academy scholarship application ${application.status}`,
          message: isApproved
            ? `Your application for ${application.scholarshipName} has been approved. The scholarship is now assigned to your student account.`
            : `Your application for ${application.scholarshipName} was not approved.${application.reviewNote ? ` Administrator feedback: ${application.reviewNote}` : ''}`,
        })
      : null;
    return NextResponse.json({ application, notifications });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (
      error.code === 'SCHOLARSHIP_APPLICATION_ALREADY_REVIEWED' ||
      error.code === 'SCHOLARSHIP_NOT_AVAILABLE' ||
      error.code === 'STUDENT_ALREADY_AWARDED' ||
      error.code === 'STUDENT_NOT_ACTIVE'
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('Academy scholarship application review error:', error);
    return NextResponse.json({ error: 'Could not review the scholarship application.' }, { status: 500 });
  }
}
