import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const storage = require('../../../../../../../backend/academy-r2');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const {
  normalizeMaterialLink,
} = require('../../../../../../../lib/academy-content');
const {
  AcademyFileUploadError,
  finalizePrivateAcademyCourseFile,
} = require('../../../../../../../lib/academy-course-file-upload');

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
    const body = await request.json().catch(() => null);
    const courseId = typeof body?.courseId === 'string' ? body.courseId.trim() : '';
    if (!courseId) {
      return NextResponse.json({ error: 'A course is required.' }, { status: 400 });
    }
    const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
    if (courseGate.error) return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });

    let material;
    if (typeof body.uploadKey === 'string') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (title.length > 160 || typeof body.fileName !== 'string') {
        return NextResponse.json({ error: 'Provide a valid file name and a title of 160 characters or fewer.' }, { status: 400 });
      }
      const { attachment, uploadedKey: key } = await finalizePrivateAcademyCourseFile(
        body.uploadKey,
        body.fileName,
        academy.newId('aclm')
      );
      uploadedKey = key;
      material = {
        kind: 'file',
        courseId,
        title: title || attachment.fileName,
        fileName: attachment.fileName,
        storageKey: attachment.storageKey,
        contentType: attachment.contentType,
        fileSize: attachment.fileSize,
      };
    } else {
      const link = normalizeMaterialLink(body.title, body.url);
      if (!link) return NextResponse.json({ error: 'Provide a title and valid HTTPS link.' }, { status: 400 });
      material = { ...link, courseId };
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
      if (error instanceof AcademyFileUploadError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
    }
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Instructor lesson material create error:', error);
    return NextResponse.json({ error: 'Could not add course material.' }, { status: 500 });
  }
}
