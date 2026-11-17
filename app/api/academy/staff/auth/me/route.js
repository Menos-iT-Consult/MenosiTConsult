import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const auth = require('../../../../../../lib/academy-auth');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

// Session probe for the staff dashboard shell.
export async function GET(request) {
  const staffIdCookie = auth.getStaffId(request);
  if (!staffIdCookie) {
    return NextResponse.json({ loggedIn: false });
  }
  try {
    const staff = await academy.getStaff(staffIdCookie);
    if (!staff || staff.status !== 'active') {
      return NextResponse.json({ loggedIn: false });
    }
    return NextResponse.json({
      loggedIn: true,
      staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role },
    });
  } catch (err) {
    const noDb = noDbErrorResponse(err);
    if (noDb) return noDb;
    console.error('Academy staff me error:', err);
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}
