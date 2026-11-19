import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const certificate = await academy.getStudentCertificate(student.id);
    return NextResponse.json({
      certificate: certificate
        ? {
            certificateNumber: certificate.certificateNumber,
            studentName: certificate.studentName,
            programName: certificate.programName,
            issueDate: certificate.issueDate,
            issuedAt: certificate.issuedAt,
          }
        : null,
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student certificate lookup error:', error);
    return NextResponse.json({ error: 'Could not load your certificate status.' }, { status: 500 });
  }
}
