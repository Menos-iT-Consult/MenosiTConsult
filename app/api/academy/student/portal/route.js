import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { calculateSemesterFee } = require('../../../../../lib/academy-finance');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }

    const portal = await academy.getStudentPortalData(student.id);
    const [program, scholarship] = await Promise.all([
      student.programId ? academy.getProgram(student.programId) : null,
      academy.getStudentScholarship(student.id),
    ]);
    const feePerSemester = program?.feeStructure?.feePerSemester;
    const semesterFee = feePerSemester == null
      ? null
      : calculateSemesterFee(feePerSemester, scholarship);
    return NextResponse.json({
      student: {
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        mustChangePassword: student.mustChangePassword,
        programId: student.programId,
        programName: program?.name || '',
      },
      academicFees: !semesterFee
        ? null
        : {
            ...semesterFee,
            scholarshipName: scholarship?.name || '',
          },
      ...portal,
    });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy student portal data error:', err);
    return NextResponse.json(
      { error: 'Could not load student portal data.' },
      { status: 500 }
    );
  }
}
