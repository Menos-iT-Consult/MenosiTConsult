import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const storage = require('../../../../../backend/academy-r2');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

export async function GET(request) {
  const studentId = auth.getStudentId(request);
  if (!studentId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  try {
    const student = await academy.getStudent(studentId);
    if (!student || student.status !== 'active') {
      return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    }
    let photo;
    if (storage.isPrivatePhotoKey(student.photo)) {
      photo = await storage.getPrivatePhoto(student.photo);
    } else {
      const key = storage.getAcademyMediaKey(student.photo);
      if (!key) return NextResponse.json({ error: 'Passport photo not found.' }, { status: 404 });
      photo = {
        bytes: await storage.getImageBytes(key),
        mime: storage.getAcademyMediaMime(key),
      };
    }
    return new NextResponse(photo.bytes, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Length': String(photo.bytes.length),
        'Content-Type': photo.mime,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy student passport photo error:', error);
    return NextResponse.json({ error: 'Could not load your passport photo.' }, { status: 500 });
  }
}
