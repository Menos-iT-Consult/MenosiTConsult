import { NextResponse } from 'next/server';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sign } = require('cookie-signature');
const db = require('../../../../backend/db');
const academy = require('../../../../backend/academy-db');
const {
  createLoginProtectionKeys,
  getClientIp,
  loginProtectionResponse,
} = require('../../../../lib/academy-login-rate-limit');

const PROD = process.env.NODE_ENV === 'production';
const ENV_USER = process.env.ADMIN_USERNAME || 'admin';
const ENV_PASS = process.env.ADMIN_PASSWORD || 'admin123';

function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

async function verifyAdmin(username, password) {
  try {
    const admin = await db.getAdmin(); // throws when no DB pool / table missing
    const hash = admin && admin.passwordHash;
    if (!hash) throw new Error('no password hash stored');
    if (username !== (admin.username || ENV_USER)) return false;
    return bcrypt.compare(String(password), hash);
  } catch {
    return username === ENV_USER && safeEqual(password, ENV_PASS);
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }
  try {
    if (!process.env.SESSION_SECRET) {
      return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
    }

    const protectionKeys = createLoginProtectionKeys({
      accountType: 'admin',
      account: String(username),
      clientIp: getClientIp(request),
      secret: process.env.SESSION_SECRET,
    });
    let protection = null;
    try {
      protection = await academy.reserveAcademyLoginAttempts(protectionKeys);
    } catch (limitError) {
      if (!limitError.noDb) throw limitError;
    }
    if (protection && !protection.allowed) {
      const blocked = loginProtectionResponse(protection.retryAfterSeconds);
      return NextResponse.json(
        { error: blocked.message },
        { status: 429, headers: { 'Retry-After': String(blocked.seconds) } }
      );
    }

    const ok = await verifyAdmin(String(username), password);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: 'admin_auth',
      value: sign('true', process.env.SESSION_SECRET),
      httpOnly: true,
      sameSite: 'lax',
      secure: PROD,
      path: '/',
      maxAge: 8 * 60 * 60,
    });
    if (protection) await academy.clearAcademyLoginAttempts(protectionKeys);
    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
  }
}
