import { NextResponse } from 'next/server';

const academy = require('../../../../backend/academy-db');
const { noDbErrorResponse } = require('../../../../lib/api-helpers');

// Public: programs open for application (portal registration form).
export async function GET() {
  try {
    const programs = await academy.listPrograms({ publishedOnly: true });
    return NextResponse.json(
      programs.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        durationSemesters: p.durationSemesters,
      }))
    );
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy programs error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
