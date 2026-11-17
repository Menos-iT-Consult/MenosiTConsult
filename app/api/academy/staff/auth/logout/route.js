import { NextResponse } from 'next/server';

const auth = require('../../../../../../lib/academy-auth');

export async function POST() {
  const response = NextResponse.json({ success: true });
  auth.clearAcademyCookie(response, auth.STAFF_COOKIE);
  return response;
}
