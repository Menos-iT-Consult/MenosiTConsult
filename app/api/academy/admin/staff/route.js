import { NextResponse } from 'next/server';

const academy = require('../../../../../backend/academy-db');
const auth = require('../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../lib/api-helpers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin(request) {
  const staffIdCookie = auth.getStaffId(request);
  if (!staffIdCookie) return { error: 401, message: 'Not signed in.' };
  const staff = await academy.getStaff(staffIdCookie).catch(() => null);
  if (!staff || staff.status !== 'active') return { error: 401, message: 'Not signed in.' };
  if (staff.role !== 'admin') return { error: 403, message: 'Only academy administrators can manage staff accounts.' };
  return { staff };
}

export async function GET(request) {
  try {
    const gate = await requireAdmin(request);
    if (gate.error) return NextResponse.json({ error: gate.message }, { status: gate.error });
    const staff = await academy.listStaff();
    return NextResponse.json(staff);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff list error:', err);
    return NextResponse.json({ error: 'Could not load staff accounts.' }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const role = body.role === 'admin' ? 'admin' : 'instructor';
  const password = String(body.password || '');

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    const gate = await requireAdmin(request);
    if (gate.error) return NextResponse.json({ error: gate.message }, { status: gate.error });
    if (await academy.getStaffByEmail(email)) {
      return NextResponse.json({ error: 'A staff account with this email already exists.' }, { status: 409 });
    }
    const staff = await academy.createStaff({ name, email, role, password });
    return NextResponse.json(staff);
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff create error:', err);
    return NextResponse.json({ error: 'Could not create the staff account.' }, { status: 500 });
  }
}
