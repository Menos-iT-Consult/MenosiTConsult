import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const {
  sendStudentNotifications,
  summarizeStudentNotifications,
} = require('../../../../../lib/academy-notifications');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const { normalizeQuizInput } = require('../../../../../lib/academy-quizzes');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const courseId = new URL(request.url).searchParams.get('course_id');
    if (!courseId) return NextResponse.json({ error: 'A course is required.' }, { status: 400 });
    const courseGate = await staffAuth.requireAssignedCourse(request, courseId);
    if (courseGate.error) return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    return NextResponse.json(await academy.listInstructorQuizzes(gate.staff.id, courseId));
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Instructor quizzes load error:', error);
    return NextResponse.json({ error: 'Could not load quizzes.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    const quiz = normalizeQuizInput(body);
    if (!quiz) {
      return NextResponse.json({ error: 'Provide a valid quiz, time limit, attempt limit, and questions.' }, { status: 400 });
    }
    const courseGate = await staffAuth.requireAssignedCourse(request, quiz.courseId);
    if (courseGate.error) return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    if (!(await academy.listSessions()).some((session) => session.id === quiz.sessionId)) {
      return NextResponse.json({ error: 'The selected session was not found.' }, { status: 400 });
    }
    const saved = await academy.createInstructorQuiz(gate.staff.id, quiz);
    if (!saved) return NextResponse.json({ error: 'Course or session was not found.' }, { status: 404 });

    let notifications = null;
    if (saved.published) {
      const [students, course] = await Promise.all([
        academy.listStudentsForCourseSession(saved.courseId, saved.sessionId),
        academy.getCourse(saved.courseId),
      ]);
      notifications = summarizeStudentNotifications(await sendStudentNotifications(students, {
        type: 'quiz_published',
        subject: `New quiz: ${saved.title}`,
        emailMessage: `A new quiz is available in ${course?.title || 'your course'}.\n\n${saved.title}\nTime limit: ${saved.durationMinutes} minutes\nAttempts allowed: ${saved.maxAttempts}\n\nSign in to the MITA Academy portal to take the quiz.`,
        smsMessage: `New MITA Academy quiz in ${course?.title || 'your course'}: ${saved.title}. ${saved.durationMinutes} minute time limit.`,
      }));
    }
    return NextResponse.json({ ...saved, notifications }, { status: 201 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Instructor quiz create error:', error);
    return NextResponse.json({ error: 'Could not create quiz.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    if (typeof body?.quizId !== 'string' || body.quizId.length > 200) {
      return NextResponse.json({ error: 'A valid quiz is required.' }, { status: 400 });
    }
    const quiz = normalizeQuizInput(body);
    if (!quiz || quiz.published) {
      return NextResponse.json({ error: 'Provide a valid draft quiz, time limit, attempt limit, and questions.' }, { status: 400 });
    }
    const courseGate = await staffAuth.requireAssignedCourse(request, quiz.courseId);
    if (courseGate.error) return NextResponse.json({ error: courseGate.error }, { status: courseGate.status });
    if (!(await academy.listSessions()).some((session) => session.id === quiz.sessionId)) {
      return NextResponse.json({ error: 'The selected session was not found.' }, { status: 400 });
    }
    const updated = await academy.updateInstructorQuiz(gate.staff.id, body.quizId, quiz);
    if (!updated) {
      return NextResponse.json({
        error: 'Only unpublished quizzes with no student attempts can be edited.',
      }, { status: 409 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Instructor quiz update error:', error);
    return NextResponse.json({ error: 'Could not update quiz.' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => null);
    if (typeof body?.quizId !== 'string' || typeof body?.published !== 'boolean') {
      return NextResponse.json({ error: 'A quiz and publication status are required.' }, { status: 400 });
    }
    const result = await academy.setInstructorQuizPublished(
      gate.staff.id,
      body.quizId,
      body.published
    );
    if (!result) return NextResponse.json({ error: 'Quiz not found in your courses.' }, { status: 404 });
    if (result.published && !result.wasPublished) {
      const [students, course, quizzes] = await Promise.all([
        academy.listStudentsForCourseSession(result.courseId, result.sessionId),
        academy.getCourse(result.courseId),
        academy.listInstructorQuizzes(gate.staff.id, result.courseId),
      ]);
      const quiz = quizzes.find((item) => item.id === result.id);
      if (quiz) {
        const notifications = summarizeStudentNotifications(await sendStudentNotifications(students, {
          type: 'quiz_published',
          subject: `New quiz: ${quiz.title}`,
          emailMessage: `A new quiz is available in ${course?.title || 'your course'}: ${quiz.title}. Sign in to the MITA Academy portal to take it.`,
          smsMessage: `New MITA Academy quiz in ${course?.title || 'your course'}: ${quiz.title}.`,
        }));
        return NextResponse.json({ ...result, notifications });
      }
    }
    return NextResponse.json(result);
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Instructor quiz publication error:', error);
    return NextResponse.json({ error: 'Could not update quiz publication.' }, { status: 500 });
  }
}
