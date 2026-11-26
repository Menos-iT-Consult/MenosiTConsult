import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const storage = require('../../../../../../../backend/academy-r2');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const {
  AcademyFileUploadError,
  finalizePrivateAcademyCourseFile,
} = require('../../../../../../../lib/academy-course-file-upload');

export async function POST(request, { params }) {
  let uploadedKey = '';
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id: assignmentId } = await params;
    const assignment = await academy.getInstructorAssignment(gate.staff.id, assignmentId);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found in your courses.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    if (typeof body?.uploadKey !== 'string' || typeof body?.fileName !== 'string') {
      return NextResponse.json({ error: 'Upload a file before attaching it to this assignment.' }, { status: 400 });
    }
    const { attachment, uploadedKey: key } = await finalizePrivateAcademyCourseFile(
      body.uploadKey,
      body.fileName,
      academy.newId('acaf')
    );
    uploadedKey = key;
    const updated = await academy.addInstructorAssignmentAttachment(
      gate.staff.id,
      assignmentId,
      attachment
    );
    if (!updated) {
      await storage.deletePrivateCourseMaterial(uploadedKey);
      uploadedKey = '';
      return NextResponse.json({ error: 'Assignment not found in your courses.' }, { status: 404 });
    }
    uploadedKey = '';
    return NextResponse.json(updated.attachments.find((item) => item.id === attachment.id), { status: 201 });
  } catch (error) {
    if (uploadedKey) {
      try {
        await storage.deletePrivateCourseMaterial(uploadedKey);
      } catch (cleanupError) {
        console.error('Academy assignment attachment cleanup error:', cleanupError);
      }
    }
    if (error instanceof AcademyFileUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Instructor assignment attachment upload error:', error);
    return NextResponse.json({ error: 'Could not upload assignment attachment.' }, { status: 500 });
  }
}
