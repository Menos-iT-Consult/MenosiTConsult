import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const auth = require('../../../../lib/academy-auth');
const staffAuth = require('../../../../lib/academy-staff');
const { sendStudentNotification } = require('../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');

async function activeStudent(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return null;
  const student = await academy.getStudent(studentId);
  return student && student.status === 'active' ? student : null;
}

export async function GET(request) {
  try {
    const courseId = new URL(request.url).searchParams.get('course_id');
    if (auth.getStaffId(request)) {
      const gate = await staffAuth.requireInstructor(request);
      if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
      if (courseId) {
        const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
        if (courseGate.error) {
          return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
        }
        return NextResponse.json(await academy.listInstructorRoster(courseId, gate.staff.id));
      }
      const courses = await academy.listCourses({ instructorStaffId: gate.staff.id });
      const rosters = await Promise.all(
        courses.map((course) => academy.listInstructorRoster(course.id, gate.staff.id))
      );
      return NextResponse.json(rosters.flat());
    }

    const student = await activeStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const { rows } = await academy.q(
      `SELECT * FROM academy_enrollments
        WHERE student_id = $1 AND status IN ('enrolled', 'active')
        ORDER BY created_at DESC`,
      [student.id]
    );
    return NextResponse.json(courseId ? rows.filter((row) => row.course_id === courseId) : rows);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy enrollments error:', err);
    return NextResponse.json({ error: 'Could not load enrollments.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    if (!body.studentId || !body.courseId || !body.sessionId) {
      return NextResponse.json({ error: 'Student, course, and session are required.' }, { status: 400 });
    }
    const enrollment = await academy.createEnrollment({
      studentId: body.studentId,
      courseId: body.courseId,
      sessionId: body.sessionId,
      status: body.status,
    });
    const [student, course, sessions] = await Promise.all([
      academy.getStudent(body.studentId),
      academy.getCourse(body.courseId),
      academy.listSessions(),
    ]);
    const session = sessions.find((item) => item.id === body.sessionId);
    const title = course?.title || 'a course';
    const sessionName = session?.name || 'your Academy session';
    const notifications = student
      ? await sendStudentNotification(student, {
          type: 'course_enrollment',
          subject: `Course enrollment confirmed: ${title}`,
          message: `You have been enrolled in ${title} for ${sessionName}. Sign in to the MITA Academy portal to view your course.`,
        })
      : null;
    return NextResponse.json({ ...enrollment, notifications }, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy enrollment create error:', err);
    return NextResponse.json({ error: 'Could not create enrollment.' }, { status: 500 });
  }
}
