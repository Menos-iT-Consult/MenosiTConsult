import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

export async function PUT(request, { params }) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const score = Number(body.score);
    const feedback = String(body.feedback || '').trim();
    if (!Number.isFinite(score) || score < 0 || feedback.length > 5000) {
      return NextResponse.json({ error: 'Score must be non-negative and feedback must be 5,000 characters or fewer.' }, { status: 400 });
    }
    const maxScore = await academy.getInstructorSubmissionMaxScore(gate.staff.id, id);
    if (maxScore == null) {
      return NextResponse.json({ error: 'Submission not found or not in an assigned course.' }, { status: 404 });
    }
    if (score > maxScore) {
      return NextResponse.json({ error: `Score cannot exceed the assignment maximum of ${maxScore}.` }, { status: 400 });
    }
    const submission = await academy.updateInstructorSubmission(gate.staff.id, id, { score, feedback });
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found or not in an assigned course.' }, { status: 404 });
    }
    return NextResponse.json(submission);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Instructor submission grade error:', err);
    return NextResponse.json({ error: 'Could not save submission feedback.' }, { status: 500 });
  }
}
