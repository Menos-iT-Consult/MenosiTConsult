import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { normalizeScholarshipApplicationInput } = require('../../../../../lib/academy-finance');
const { sendStudentNotification } = require('../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

async function getActiveStudent(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return null;
  const student = await academy.getStudent(studentId);
  return student?.status === 'active' ? student : null;
}

export async function GET(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const [scholarships, application, awardedScholarship] = await Promise.all([
      academy.listScholarships(),
      academy.getStudentScholarshipApplication(student.id),
      academy.getStudentScholarship(student.id),
    ]);
    return NextResponse.json({
      scholarships: scholarships.filter((scholarship) =>
        scholarship.active && (!scholarship.programId || scholarship.programId === student.programId)
      ).map(({ id, name, description, programId, programName, discountType, discountValue }) => ({
        id, name, description, programId, programName, discountType, discountValue,
      })),
      application: application && {
        id: application.id,
        scholarshipName: application.scholarshipName,
        discountType: application.discountType,
        discountValue: application.discountValue,
        statement: application.statement,
        status: application.status,
        reviewNote: application.reviewNote,
        createdAt: application.createdAt,
        reviewedAt: application.reviewedAt,
      },
      awardedScholarship: awardedScholarship && {
        name: awardedScholarship.name,
        discountType: awardedScholarship.discountType,
        discountValue: awardedScholarship.discountValue,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student scholarship applications error:', error);
    return NextResponse.json({ error: 'Could not load scholarship applications.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

    const body = await request.json().catch(() => null);
    const input = normalizeScholarshipApplicationInput(body);
    if (!input) {
      return NextResponse.json(
        { error: 'Choose a scholarship and provide a statement between 20 and 2,000 characters.' },
        { status: 400 }
      );
    }

    const application = await academy.createScholarshipApplication(
      student.id,
      input.scholarshipId,
      input.statement
    );
    const notifications = await sendStudentNotification(student, {
      type: 'scholarship_application_received',
      subject: 'MITA Academy scholarship application received',
      message: `We received your application for ${application.scholarshipName}. An Academy administrator will review it and notify you of the decision.`,
    });
    return NextResponse.json({ application, notifications }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.code === 'SCHOLARSHIP_APPLICATION_PENDING' || error.code === 'STUDENT_ALREADY_AWARDED') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error.code === 'SCHOLARSHIP_NOT_AVAILABLE' || error.code === 'SCHOLARSHIP_NOT_ELIGIBLE') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === 'STUDENT_NOT_ACTIVE') {
      return NextResponse.json({ error: 'An active student account is required to apply.' }, { status: 401 });
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A scholarship application is already under review.' },
        { status: 409 }
      );
    }
    console.error('Academy student scholarship application error:', error);
    return NextResponse.json({ error: 'Could not submit the scholarship application.' }, { status: 500 });
  }
}
