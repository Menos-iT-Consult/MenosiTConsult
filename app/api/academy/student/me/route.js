import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const storage = require('../../../../../backend/academy-r2');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

async function loadStudent(request) {
  const id = auth.getStudentId(request);
  if (!id) return null;
  return academy.getStudent(id);
}

export async function GET(request) {
  const student = await loadStudent(request).catch((err) => ({ __err: err }));
  if (student && student.__err) {
    const noDb = noDbErrorResponse(student.__err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Could not load your profile.' }, { status: 500 });
  }
  if (!student || student.status !== 'active') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  let program = null;
  try {
    program = student.programId ? await academy.getProgram(student.programId) : null;
  } catch {
    program = null;
  }

  return NextResponse.json({
    id: student.id,
    studentId: student.studentId,
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    photo: storage.isPrivatePhotoKey(student.photo) || storage.getAcademyMediaKey(student.photo)
      ? '/api/academy/student/photo'
      : student.photo,
    dob: student.dob,
    address: student.address,
    city: student.city,
    region: student.region,
    guardianName: student.guardianName,
    guardianPhone: student.guardianPhone,
    status: student.status,
    mustChangePassword: student.mustChangePassword,
    createdAt: student.createdAt,
    admittedAt: student.admittedAt,
    program: program
      ? { id: program.id, code: program.code, name: program.name, durationSemesters: program.durationSemesters }
      : null,
  });
}

export async function PUT(request) {
  const student = await loadStudent(request).catch((err) => ({ __err: err }));
  if (student && student.__err) {
    const noDb = noDbErrorResponse(student.__err);
    if (noDb) return noDb;
    return NextResponse.json({ error: 'Could not update your profile.' }, { status: 500 });
  }
  if (!student || student.status !== 'active') {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const updated = await academy.updateStudent(student.id, {
    phone: body.phone != null ? String(body.phone).trim() || null : null,
    dob: body.dob != null ? String(body.dob).trim() || null : null,
    address: body.address != null ? String(body.address).trim() || null : null,
    guardianName: body.guardianName != null ? String(body.guardianName).trim() || null : null,
    guardianPhone: body.guardianPhone != null ? String(body.guardianPhone).trim() || null : null,
  }).catch((err) => ({ __err: err }));

  if (updated && updated.__err) {
    const noDb = noDbErrorResponse(updated.__err);
    if (noDb) return noDb;
    console.error('Academy student update error:', updated.__err);
    return NextResponse.json({ error: 'Could not save your changes.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
