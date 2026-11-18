import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const name = body.name == null ? null : String(body.name).trim();
    const email = body.email == null ? null : String(body.email).trim().toLowerCase();
    const status = body.status == null ? null : String(body.status);
    if (name != null && (!name || name.length > 120)) {
      return NextResponse.json({ error: 'Name must be between 1 and 120 characters.' }, { status: 400 });
    }
    if (email != null && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (status != null && !['active', 'inactive'].includes(status)) {
      return NextResponse.json({ error: 'Status must be active or inactive.' }, { status: 400 });
    }

    const existing = await academy.getStaff(id);
    if (!existing) return NextResponse.json({ error: 'Staff account not found.' }, { status: 404 });
    if (
      body.courseIds != null &&
      (
        existing.role !== 'instructor' ||
        !Array.isArray(body.courseIds) ||
        body.courseIds.some((courseId) => typeof courseId !== 'string')
      )
    ) {
      return NextResponse.json({ error: 'Course assignments must be a list of course IDs for an instructor.' }, { status: 400 });
    }
    if (id === gate.staff.id && status === 'inactive') {
      return NextResponse.json({ error: 'You cannot deactivate your own account.' }, { status: 400 });
    }
    if (existing.status === 'pending' && status != null) {
      return NextResponse.json(
        { error: 'Pending invitations can only be activated by accepting the setup link.' },
        { status: 400 }
      );
    }
    if (email) {
      const duplicate = await academy.getStaffByEmail(email);
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'Another staff account already uses this email.' }, { status: 409 });
      }
    }
    const updated = await academy.updateStaff(id, {
      name,
      email,
      status,
    });
    if (!updated) return NextResponse.json({ error: 'Staff account not found.' }, { status: 404 });

    if (body.courseIds != null) {
      await academy.setInstructorCourses(id, body.courseIds);
    }
    return NextResponse.json(updated);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Another staff account already uses this email.' }, { status: 409 });
    }
    if (err.code === 'COURSE_NOT_FOUND') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('Academy staff update error:', err);
    return NextResponse.json({ error: 'Could not update the staff account.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const { id } = await params;
    if (id === gate.staff.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }
    const staff = await academy.getStaff(id);
    if (!staff) return NextResponse.json({ error: 'Staff account not found.' }, { status: 404 });
    await academy.deleteStaff(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff delete error:', err);
    return NextResponse.json({ error: 'Could not delete the staff account.' }, { status: 500 });
  }
}
