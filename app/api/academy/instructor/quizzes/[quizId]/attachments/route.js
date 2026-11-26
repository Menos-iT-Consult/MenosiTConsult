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
    const { quizId } = await params;
    const body = await request.json().catch(() => null);
    const courseId = typeof body?.courseId === 'string' ? body.courseId : '';
    if (!courseId) return NextResponse.json({ error: 'A course is required.' }, { status: 400 });
    const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
    if (courseGate.error) {
      return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    }
    const questionId = typeof body.questionId === 'string' ? body.questionId : '';
    if (questionId && !/^q([1-9]|[1-4][0-9]|50)$/.test(questionId)) {
      return NextResponse.json({ error: 'A valid quiz question is required.' }, { status: 400 });
    }
    if (typeof body.uploadKey !== 'string' || typeof body.fileName !== 'string') {
      return NextResponse.json({ error: 'Upload a file before attaching it to this quiz.' }, { status: 400 });
    }

    const { attachment, uploadedKey: key } = await finalizePrivateAcademyCourseFile(
      body.uploadKey,
      body.fileName,
      academy.newId('acaf')
    );
    uploadedKey = key;
    const updated = await academy.addInstructorQuizAttachment(
      gate.staff.id,
      quizId,
      questionId,
      attachment
    );
    if (!updated) {
      await storage.deletePrivateCourseMaterial(uploadedKey);
      uploadedKey = '';
      return NextResponse.json({ error: 'Quiz or question not found in your courses.' }, { status: 404 });
    }
    uploadedKey = '';
    return NextResponse.json({
      id: attachment.id,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      contentType: attachment.contentType,
      downloadUrl: `/api/academy/quizzes/${encodeURIComponent(quizId)}/attachments/${encodeURIComponent(attachment.id)}`,
    }, { status: 201 });
  } catch (error) {
    if (uploadedKey) {
      try {
        await storage.deletePrivateCourseMaterial(uploadedKey);
      } catch (cleanupError) {
        console.error('Academy quiz attachment cleanup error:', cleanupError);
      }
    }
    if (error instanceof AcademyFileUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Instructor quiz attachment upload error:', error);
    return NextResponse.json({ error: 'Could not upload quiz attachment.' }, { status: 500 });
  }
}
