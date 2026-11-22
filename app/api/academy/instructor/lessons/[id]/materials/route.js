import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const storage = require('../../../../../../../backend/academy-r2');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const {
  normalizeMaterialLink,
  validateCourseMaterialFile,
} = require('../../../../../../../lib/academy-content');

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function GET(request, { params }) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const materials = await academy.listInstructorLessonMaterials(gate.staff.id, id);
    return NextResponse.json(materials);
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Instructor lesson materials load error:', error);
    return NextResponse.json({ error: 'Could not load lesson materials.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  let uploadedKey = '';
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';
    let material;

    if (contentType.includes('application/json')) {
      const body = await request.json().catch(() => null);
      const link = normalizeMaterialLink(body?.title, body?.url);
      if (!link || typeof body?.courseId !== 'string' || !body.courseId.trim()) {
        return NextResponse.json({ error: 'Provide a title and valid HTTPS link.' }, { status: 400 });
      }
      const courseGate = await staffAuth.requireAssignedCourse(request, body.courseId);
      if (courseGate.error) return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
      material = { ...link, courseId: body.courseId };
    } else {
      const contentLength = Number(request.headers.get('content-length') || 0);
      if (contentLength > MAX_FILE_SIZE + 65536) {
        return NextResponse.json({ error: 'Course files must be 4 MB or smaller.' }, { status: 413 });
      }
      const form = await request.formData();
      const courseId = String(form.get('courseId') || '');
      const file = form.get('file');
      const title = String(form.get('title') || '').trim();
      if (!courseId || !file || typeof file.arrayBuffer !== 'function') {
        return NextResponse.json({ error: 'Select a course file to upload.' }, { status: 400 });
      }
      if (title.length > 160) {
        return NextResponse.json({ error: 'Material title must be 160 characters or fewer.' }, { status: 400 });
      }
      const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
      if (courseGate.error) return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Course files must be 4 MB or smaller.' }, { status: 413 });
      }
      if (!storage.certificateStorageEnabled()) {
        return NextResponse.json({ error: 'Private Academy course-file storage is not configured.' }, { status: 503 });
      }
      const bytes = Buffer.from(await file.arrayBuffer());
      const fileInfo = validateCourseMaterialFile(file.name, file.type, bytes);
      if (!fileInfo) {
        return NextResponse.json({
          error: 'Upload a valid PDF, TXT, DOCX, PPTX, or XLSX file with a matching extension.',
        }, { status: 400 });
      }
      const savedFile = await storage.putPrivateCourseMaterial(bytes, fileInfo.mime);
      uploadedKey = savedFile.key;
      material = {
        kind: 'file',
        courseId,
        title: title || fileInfo.fileName,
        fileName: fileInfo.fileName,
        storageKey: savedFile.key,
        contentType: fileInfo.mime,
        fileSize: savedFile.size,
      };
    }

    const created = await academy.createInstructorLessonMaterial(gate.staff.id, id, material);
    if (!created) {
      if (uploadedKey) await storage.deletePrivateCourseMaterial(uploadedKey);
      return NextResponse.json({ error: 'Lesson not found in your assigned course.' }, { status: 404 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (uploadedKey) {
      try {
        await storage.deletePrivateCourseMaterial(uploadedKey);
      } catch (cleanupError) {
        console.error('Academy course material cleanup error:', cleanupError);
      }
    }
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Instructor lesson material create error:', error);
    return NextResponse.json({ error: 'Could not add course material.' }, { status: 500 });
  }
}
