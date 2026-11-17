import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const auth = require('../../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin(request) {
  const staffIdCookie = auth.getStaffId(request);
  if (!staffIdCookie) return { error: 401, message: 'Not signed in.' };
  const staff = await academy.getStaff(staffIdCookie).catch(() => null);
  if (!staff || staff.status !== 'active') return { error: 401, message: 'Not signed in.' };
  if (staff.role !== 'admin') return { error: 403, message: 'Only academy administrators can manage staff accounts.' };
  return { staff };
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const role = body.role === 'admin' ? 'admin' : 'instructor';
  const status = body.status === 'inactive' ? 'inactive' : 'active';

  try {
    const gate = await requireAdmin(request);
    if (gate.error) return NextResponse.json({ error: gate.message }, { status: gate.error });
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }
    if (id === gate.staff.id && (role !== 'admin' || status !== 'active')) {
      return NextResponse.json({ error: 'You cannot remove your own admin access or deactivate yourself.' }, { status: 400 });
    }
    if (email) {
      const existing = await academy.getStaffByEmail(email);
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Another staff account already uses this email.' }, { status: 409 });
      }
    }
    const updated = await academy.updateStaff(id, {
      name: name || null,
      email: email || null,
      role: body.role != null ? role : null,
      status: body.status != null ? status : null,
    });
    if (!updated) return NextResponse.json({ error: 'Staff account not found.' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff update error:', err);
    return NextResponse.json({ error: 'Could not update the staff account.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const gate = await requireAdmin(request);
    if (gate.error) return NextResponse.json({ error: gate.message }, { status: gate.error });
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
