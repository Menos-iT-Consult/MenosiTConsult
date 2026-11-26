import { NextResponse } from 'next/server';

const storage = require('../../../../../../backend/academy-r2');
const staffAuth = require('../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');
const { MAX_ACADEMY_FILE_SIZE } = require('../../../../../../lib/academy-content');

async function authorizeCourse(request, staffId, courseId) {
  if (typeof courseId !== 'string' || !courseId.trim()) {
    return { error: 'A course is required.', status: 400 };
  }
  const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
  if (courseGate.error) return { error: courseGate.error, status: courseGate.status };
  if (!staffId) return { error: 'Not signed in.', status: 401 };
  return null;
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    const courseId = typeof body?.courseId === 'string' ? body.courseId : '';
    const authorizationError = await authorizeCourse(request, gate.staff.id, courseId);
    if (authorizationError) {
      return NextResponse.json(
        { error: authorizationError.error },
        { status: authorizationError.status }
      );
    }
    const mime = typeof body?.mime === 'string'
      ? body.mime.split(';')[0].trim().toLowerCase()
      : '';
    const size = Number(body?.size);
    if (!Number.isSafeInteger(size) || size < 1 || size > MAX_ACADEMY_FILE_SIZE) {
      return NextResponse.json({ error: 'Course files must be between 1 byte and 10 MB.' }, { status: 413 });
    }
    const signed = await storage.presignPrivateCourseMaterialUpload(mime, size);
    return NextResponse.json(signed);
  } catch (error) {
    if (error.invalidCourseMaterial) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Academy course-file presign error:', error);
    return NextResponse.json({ error: 'Could not prepare the private file upload.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    const courseId = typeof body?.courseId === 'string' ? body.courseId : '';
    const authorizationError = await authorizeCourse(request, gate.staff.id, courseId);
    if (authorizationError) {
      return NextResponse.json(
        { error: authorizationError.error },
        { status: authorizationError.status }
      );
    }
    if (!storage.isPrivateCourseMaterialUploadKey(body?.key)) {
      return NextResponse.json({ error: 'Invalid temporary file upload.' }, { status: 400 });
    }
    await storage.deletePrivateCourseMaterialUpload(body.key);
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Academy staged course-file cleanup error:', error);
    return NextResponse.json({ error: 'Could not clean up the temporary file upload.' }, { status: 500 });
  }
}
