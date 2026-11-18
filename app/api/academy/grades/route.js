import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const auth = require('../../../../lib/academy-auth');
const staffAuth = require('../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');

async function activeStudent(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return null;
  const student = await academy.getStudent(studentId);
  return student && student.status === 'active' ? student : null;
}

export async function GET(request) {
  try {
    if (auth.getStaffId(request)) {
      const gate = await staffAuth.requireInstructor(request);
      if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
      const courseId = new URL(request.url).searchParams.get('course_id');
      if (courseId) {
        const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
        if (courseGate.error) {
          return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
        }
        return NextResponse.json(await academy.listInstructorGradebook(gate.staff.id, courseId));
      }
      const courses = await academy.listCourses({ instructorStaffId: gate.staff.id });
      const gradebooks = await Promise.all(
        courses.map((course) => academy.listInstructorGradebook(gate.staff.id, course.id))
      );
      return NextResponse.json(gradebooks.flat());
    }

    const student = await activeStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const { rows: enrollments } = await academy.q(
      `SELECT id FROM academy_enrollments
        WHERE student_id = $1 AND status IN ('enrolled', 'active')
        ORDER BY created_at DESC`,
      [student.id]
    );
    const grades = await Promise.all(enrollments.map(async (enrollment) => {
      const stored = await academy.getGrade(enrollment.id);
      return stored || academy.calculateGrade(enrollment.id);
    }));
    return NextResponse.json(grades.filter(Boolean));
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy grades error:', err);
    return NextResponse.json({ error: 'Could not load grades.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const enrollmentId = String(body.enrollmentId || '');
    const ca = Number(body.ca);
    const exam = Number(body.exam);
    if (!enrollmentId || !Number.isFinite(ca) || !Number.isFinite(exam) ||
        ca < 0 || ca > 100 || exam < 0 || exam > 100) {
      return NextResponse.json({ error: 'Enrollment ID and valid CA/exam scores from 0 to 100 are required.' }, { status: 400 });
    }
    const grade = await academy.upsertInstructorGrade(gate.staff.id, { enrollmentId, ca, exam });
    if (!grade) {
      return NextResponse.json({ error: 'Enrollment not found or not in an assigned course.' }, { status: 404 });
    }
    return NextResponse.json(grade);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy grade upsert error:', err);
    return NextResponse.json({ error: 'Could not save grade.' }, { status: 500 });
  }
}
