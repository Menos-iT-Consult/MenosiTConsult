import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const auth = require('../../../../../../lib/academy-auth');
const storage = require('../../../../../../backend/academy-r2');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

export async function GET(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    const certificate = await academy.getStudentCertificate(student.id);
    if (!certificate) {
      return NextResponse.json({ error: 'No certificate has been issued to your account.' }, { status: 404 });
    }
    const bytes = await storage.getPrivatePdfBytes(certificate.documentKey);
    return new Response(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${certificate.certificateNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student certificate download error:', error);
    return NextResponse.json({ error: 'Could not download your certificate.' }, { status: 500 });
  }
}
