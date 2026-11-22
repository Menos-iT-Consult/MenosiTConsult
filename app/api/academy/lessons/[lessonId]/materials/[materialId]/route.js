import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const storage = require('../../../../../../../backend/academy-r2');
const auth = require('../../../../../../../lib/academy-auth');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

function attachmentName(value) {
  const clean = String(value || 'course-material')
    .replace(/[\u0000-\u001f\u007f"\\]/g, '_')
    .slice(0, 180);
  return `attachment; filename="course-material"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

export async function GET(request, { params }) {
  try {
    const { lessonId, materialId } = await params;
    let material = null;
    const studentId = auth.getStudentId(request);
    if (studentId) {
      const student = await academy.getStudent(studentId);
      if (student?.status === 'active') {
        material = await academy.getStudentLessonMaterial(student.id, lessonId, materialId);
      }
    } else {
      const gate = await staffAuth.requireInstructor(request);
      if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
      material = await academy.getInstructorLessonMaterial(gate.staff.id, lessonId, materialId);
    }
    if (!material || material.kind !== 'file' || !storage.isPrivateCourseMaterialKey(material.storage_key)) {
      return NextResponse.json({ error: 'Course file not found or unavailable to your account.' }, { status: 404 });
    }
    const bytes = await storage.getPrivateCourseMaterial(material.storage_key);
    return new Response(bytes, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': attachmentName(material.file_name),
        'Content-Length': String(bytes.length),
        'Content-Type': material.content_type,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Academy lesson material download error:', error);
    return NextResponse.json({ error: 'Could not download course material.' }, { status: 500 });
  }
}
