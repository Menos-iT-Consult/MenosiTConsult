import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const storage = require('../../../../../../backend/academy-r2');
const {
  calculateSemesterFee,
  normalizeAmount,
} = require('../../../../../../lib/academy-finance');
const { sendStudentNotification } = require('../../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

async function getDetails(id) {
  const student = await academy.getStudent(id);
  if (!student) return null;
  const [program, scholarship, scholarships] = await Promise.all([
    student.programId ? academy.getProgram(student.programId) : null,
    academy.getStudentScholarship(student.id),
    academy.listScholarships(),
  ]);
  const availableScholarships = scholarships.filter((item) =>
    item.active && (!item.programId || item.programId === student.programId)
  );
  const fee = program?.feeStructure?.feePerSemester == null
    ? null
    : normalizeAmount(program.feeStructure.feePerSemester);
  return {
    student: {
      ...student,
      photo: storage.isPrivatePhotoKey(student.photo)
        ? `/api/academy/admin/students/${encodeURIComponent(student.id)}/photo`
        : student.photo,
    },
    program: program
      ? {
          id: program.id,
          name: program.name,
          feePerSemester: fee == null ? null : Number(fee),
          currency: program.feeStructure.currency || 'GHS',
        }
      : null,
    scholarship,
    semesterFee: fee == null ? null : calculateSemesterFee(fee, scholarship),
    availableScholarships,
  };
}

export async function GET(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const details = await getDetails(id);
    if (!details) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    return NextResponse.json(details, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy admin student details error:', error);
    return NextResponse.json({ error: 'Could not load student details.' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body || !Object.prototype.hasOwnProperty.call(body, 'scholarshipId')) {
      return NextResponse.json({ error: 'Choose a scholarship program or select No scholarship.' }, { status: 400 });
    }

    const student = await academy.getStudent(id);
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });

    let scholarshipId = body.scholarshipId;
    if (scholarshipId === '') scholarshipId = null;
    if (scholarshipId !== null && typeof scholarshipId !== 'string') {
      return NextResponse.json({ error: 'The selected scholarship is invalid.' }, { status: 400 });
    }
    if (scholarshipId) {
      const scholarship = await academy.getScholarship(scholarshipId);
      if (!scholarship || !scholarship.active) {
        return NextResponse.json({ error: 'Choose an active scholarship program.' }, { status: 400 });
      }
      if (scholarship.programId && scholarship.programId !== student.programId) {
        return NextResponse.json({ error: 'This scholarship does not apply to the student’s program.' }, { status: 400 });
      }
    }

    await academy.assignStudentScholarship(id, scholarshipId, gate.staff.id);
    const details = await getDetails(id);
    const notifications = scholarshipId
      ? await sendStudentNotification(student, {
          type: 'scholarship_awarded',
          subject: 'MITA Academy scholarship awarded',
          message: `The Academy has awarded you the ${details.scholarship.name}. Your student fee information has been updated.`,
        })
      : null;
    return NextResponse.json({ ...details, notifications }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student scholarship assignment error:', error);
    return NextResponse.json({ error: 'Could not update the student scholarship.' }, { status: 500 });
  }
}
