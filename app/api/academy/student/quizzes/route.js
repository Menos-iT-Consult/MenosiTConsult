import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');
const { publicQuizQuestion } = require('../../../../../lib/academy-quizzes');

function failure(error) {
  const errors = {
    QUIZ_NOT_FOUND: ['Quiz not found or unavailable.', 404],
    NOT_ENROLLED: ['You are not enrolled in this course session.', 403],
    NOT_OPEN: ['This quiz is not open yet.', 409],
    CLOSED: ['This quiz is closed.', 409],
    ATTEMPTS_EXHAUSTED: ['You have used all attempts for this quiz.', 409],
    ATTEMPT_NOT_FOUND: ['Quiz attempt not found.', 404],
    ATTEMPT_SUBMITTED: ['This quiz attempt has already been submitted.', 409],
    ATTEMPT_EXPIRED: ['The time limit has expired. Your saved answers were submitted.', 409],
    INVALID_ANSWERS: ['One or more submitted answers are invalid.', 400],
  };
  const [message, status] = errors[error] || ['Could not process quiz attempt.', 400];
  return NextResponse.json({ error: message, code: error }, { status });
}

async function getActiveStudent(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) return null;
  const student = await academy.getStudent(studentId);
  return student?.status === 'active' ? student : null;
}

export async function GET(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const courseId = new URL(request.url).searchParams.get('course_id');
    if (!courseId) return NextResponse.json({ error: 'A course is required.' }, { status: 400 });
    const quizzes = await academy.listStudentQuizzes(student.id, courseId);
    return NextResponse.json(quizzes.map((quiz) => ({
      ...quiz,
      questions: quiz.questions?.map((question) => publicQuizQuestion(question, quiz.id)),
    })));
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Student quizzes load error:', error);
    return NextResponse.json({ error: 'Could not load quizzes.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const student = await getActiveStudent(request);
    if (!student) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const body = await request.json().catch(() => null);
    if (typeof body?.action !== 'string') {
      return NextResponse.json({ error: 'A quiz action is required.' }, { status: 400 });
    }
    if (body.action === 'start') {
      if (typeof body.quizId !== 'string' || body.quizId.length > 200) {
        return NextResponse.json({ error: 'A valid quiz is required.' }, { status: 400 });
      }
      const result = await academy.startStudentQuizAttempt(student.id, body.quizId);
      if (result.error) return failure(result.error);
      const { quiz, attempt } = result;
      const deadline = Math.min(
        new Date(attempt.startedAt).getTime() + quiz.durationMinutes * 60000,
        quiz.closesAt ? new Date(quiz.closesAt).getTime() : Infinity
      );
      return NextResponse.json({
        attempt,
        deadline: new Date(deadline).toISOString(),
        questions: quiz.questions.map((question) => publicQuizQuestion(question, quiz.id)),
      }, { status: 201 });
    }
    if (body.action === 'save' || body.action === 'submit') {
      if (typeof body.attemptId !== 'string' || body.attemptId.length > 200) {
        return NextResponse.json({ error: 'A valid attempt is required.' }, { status: 400 });
      }
      const result = body.action === 'save'
        ? await academy.saveStudentQuizAnswers(student.id, body.attemptId, body.answers)
        : await academy.submitStudentQuizAttempt(student.id, body.attemptId, body.answers);
      if (result.error) return failure(result.error);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Unsupported quiz action.' }, { status: 400 });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Student quiz attempt error:', error);
    return NextResponse.json({ error: 'Could not process quiz attempt.' }, { status: 500 });
  }
}
