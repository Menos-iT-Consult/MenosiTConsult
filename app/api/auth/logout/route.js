import { NextResponse } from 'next/server';

const PROD = process.env.NODE_ENV === 'production';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: 'admin_auth',
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: PROD,
    path: '/',
    maxAge: 0,
  });
  return response;
}
