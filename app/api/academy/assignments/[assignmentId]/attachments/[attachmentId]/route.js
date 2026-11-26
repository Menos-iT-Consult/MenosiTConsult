import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const storage = require('../../../../../../../backend/academy-r2');
const auth = require('../../../../../../../lib/academy-auth');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');
const { privateAcademyCourseFileResponse } = require('../../../../../../../lib/academy-course-file-response');

export async function GET(request, { params }) {
  try {
    const { assignmentId, attachmentId } = await params;
    let attachment = null;
    const studentId = auth.getStudentId(request);
    if (studentId) {
      const student = await academy.getStudent(studentId);
      if (student?.status === 'active') {
        attachment = await academy.getStudentAssignmentAttachment(
          student.id,
          assignmentId,
          attachmentId
        );
      }
    } else {
      const gate = await staffAuth.requireInstructor(request);
      if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
      attachment = await academy.getInstructorAssignmentAttachment(
        gate.staff.id,
        assignmentId,
        attachmentId
      );
    }
    if (!attachment || !storage.isPrivateCourseMaterialKey(attachment.storageKey)) {
      return NextResponse.json({ error: 'Assignment file not found or unavailable to your account.' }, { status: 404 });
    }
    return await privateAcademyCourseFileResponse(attachment, storage);
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Academy assignment attachment download error:', error);
    return NextResponse.json({ error: 'Could not download assignment attachment.' }, { status: 500 });
  }
}
