import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

const academy = require('../../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../../lib/academy-staff');
const storage = require('../../../../../../../backend/academy-r2');
const {
  TEMPLATE_SETTING_KEY,
  createCertificatePdf,
} = require('../../../../../../../lib/academy-certificates');
const { sendStudentNotification } = require('../../../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

async function removeGeneratedDocument(key) {
  try {
    await storage.deletePrivatePdf(key);
  } catch (error) {
    console.error('Academy issued certificate cleanup failed:', error);
  }
}

export async function POST(request, { params }) {
  let documentKey = '';
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    if (!storage.certificateStorageEnabled()) {
      return NextResponse.json({ error: 'Private Academy certificate storage is not configured.' }, { status: 503 });
    }

    const { id } = await params;
    const student = await academy.getStudent(id);
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    if (student.status !== 'active' || !student.studentId || !student.programId) {
      return NextResponse.json({ error: 'Only active students with an assigned Student ID and program can receive a certificate.' }, { status: 409 });
    }
    if (await academy.getStudentCertificate(student.id)) {
      return NextResponse.json({ error: 'A certificate has already been issued to this student.' }, { status: 409 });
    }

    const template = await academy.getAcademySetting(TEMPLATE_SETTING_KEY);
    if (!template || typeof template.key !== 'string') {
      return NextResponse.json({ error: 'Upload the Academy certificate template before issuing certificates.' }, { status: 409 });
    }
    const program = await academy.getProgram(student.programId);
    if (!program || !program.name) {
      return NextResponse.json({ error: 'The student program is unavailable; the certificate cannot be issued.' }, { status: 409 });
    }

    const issueDate = new Date().toISOString().slice(0, 10);
    const certificateNumber = `MITA-CERT-${new Date().getFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const studentName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
    if (!studentName) {
      return NextResponse.json({ error: 'The student name is incomplete; the certificate cannot be issued.' }, { status: 409 });
    }
    const templateBytes = await storage.getPrivatePdfBytes(template.key);
    const pdfBytes = await createCertificatePdf(templateBytes, {
      student_name: studentName,
      program_name: program.name,
      issue_date: issueDate,
      certificate_number: certificateNumber,
    });
    const stored = await storage.putPrivatePdf(pdfBytes, 'issued');
    documentKey = stored.key;
    const certificate = await academy.createStudentCertificate({
      studentId: student.id,
      certificateNumber,
      studentName,
      programName: program.name,
      issueDate,
      issuedBy: gate.staff.id,
      templateKey: template.key,
      documentKey,
    });
    if (!certificate) {
      await removeGeneratedDocument(documentKey);
      documentKey = '';
      return NextResponse.json({ error: 'A certificate was issued to this student by another administrator.' }, { status: 409 });
    }
    documentKey = '';
    const notifications = await sendStudentNotification(student, {
      type: 'certificate_issued',
      subject: 'Your MITA Academy certificate is ready',
      message: `Your certificate for ${program.name} has been issued. Sign in to the MITA Academy portal to view and download it.`,
    });
    return NextResponse.json({
      certificate: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.studentName,
        programName: certificate.programName,
        issueDate: certificate.issueDate,
        issuedAt: certificate.issuedAt,
      },
      notifications,
    }, { status: 201 });
  } catch (error) {
    if (documentKey) await removeGeneratedDocument(documentKey);
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy certificate issuance error:', error);
    return NextResponse.json({ error: 'Could not issue the certificate.' }, { status: 500 });
  }
}
