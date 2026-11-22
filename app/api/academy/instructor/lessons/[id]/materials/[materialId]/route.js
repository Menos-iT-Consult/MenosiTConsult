import { NextResponse } from 'next/server';

const academy = require('../../../../../../../../backend/academy-db');
const storage = require('../../../../../../../../backend/academy-r2');
const staffAuth = require('../../../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../../../lib/api-helpers');

export async function DELETE(request, { params }) {
  try {
    const gate = await staffAuth.requireInstructor(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { id, materialId } = await params;
    const material = await academy.getInstructorLessonMaterial(gate.staff.id, id, materialId);
    if (!material) return NextResponse.json({ error: 'Lesson material not found.' }, { status: 404 });
    if (material.storage_key) await storage.deletePrivateCourseMaterial(material.storage_key);
    const deleted = await academy.deleteInstructorLessonMaterial(gate.staff.id, id, materialId);
    if (!deleted) return NextResponse.json({ error: 'Lesson material not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.noR2) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error('Instructor lesson material delete error:', error);
    return NextResponse.json({ error: 'Could not remove lesson material.' }, { status: 500 });
  }
}
