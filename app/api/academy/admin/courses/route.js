import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const staffAuth = require('../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const [courses, programs] = await Promise.all([
      academy.listCourses(),
      academy.listPrograms(),
    ]);
    return NextResponse.json({ courses, programs });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy admin courses error:', err);
    return NextResponse.json({ error: 'Could not load Academy courses.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const body = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const code = String(body.code || '').trim();
    const programId = String(body.programId || '');
    const creditHours = Number(body.creditHours);
    const semesterNumber = Number(body.semesterNumber);
    if (
      !title || title.length > 160 || !code || code.length > 32 ||
      String(body.description || '').length > 3000 ||
      !Number.isInteger(creditHours) || creditHours < 1 || creditHours > 30 ||
      !Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 20 ||
      (programId && !(await academy.getProgram(programId)))
    ) {
      return NextResponse.json(
        { error: 'Provide a title, course code, valid program, credit hours (1–30), and semester (1–20).' },
        { status: 400 }
      );
    }
    if ((await academy.listCourses()).some((course) => course.code.toLowerCase() === code.toLowerCase())) {
      return NextResponse.json({ error: 'A course already uses this code.' }, { status: 409 });
    }
    const course = await academy.createCourse({
      title,
      code,
      programId: programId || null,
      creditHours,
      semesterNumber,
      description: String(body.description || '').trim(),
    });
    return NextResponse.json(course, { status: 201 });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    if (err.code === '23505') {
      return NextResponse.json({ error: 'A course already uses this code.' }, { status: 409 });
    }
    console.error('Academy admin course create error:', err);
    return NextResponse.json({ error: 'Could not create course.' }, { status: 500 });
  }
}
