import { NextResponse } from 'next/server';

const academy = require('../../../../../../../backend/academy-db');
const storage = require('../../../../../../../backend/academy-r2');
const staffAuth = require('../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../lib/api-helpers');

export async function GET(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    const student = await academy.getStudent(id);
    if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    let photo;
    const privatePhotoKey = storage.getPrivatePhotoKey(student.photo);
    if (privatePhotoKey) {
      photo = await storage.getPrivatePhoto(privatePhotoKey);
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
    console.error('Academy admin student passport photo error:', error);
    return NextResponse.json({ error: 'Could not load the student passport photo.' }, { status: 500 });
  }
}
