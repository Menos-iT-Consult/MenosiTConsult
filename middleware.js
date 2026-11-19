import { NextResponse } from 'next/server';
import { getAcademyDatabaseConfigError } from './lib/academy-db-config';

/**
 * Auth gate for /admin.
 *
 * The Express backend sets a signed httpOnly cookie `admin_auth` via
 * cookie-parser + cookie-signature with secret SESSION_SECRET:
 *   raw value   = `s:<val>.<base64url-standard HMAC-SHA256 of <val>>`
 *   (cookie-signature strips trailing '=' padding from the base64 digest)
 *   cookie sent = encodeURIComponent(raw value)  → 's%3Atrue.XXXX'
 *
 * We mirror cookie-parser's verification with edge-safe Web Crypto: recompute
 * the HMAC over the payload, base64-encode it (standard alphabet, +,/,=),
 * strip padding on both sides and compare. Invalid signature or missing
 * cookie → redirect to /admin/login (except for /admin/login itself).
 *
 * NOTE: Next.js only loads middleware from the project root (or src/) —
 * `app/middleware.ts` is NOT picked up, hence this file's location.
 */

const COOKIE_NAME = 'admin_auth';

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function stripPadding(value) {
  return value.replace(/=+$/, '');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySignedCookie(raw, secret) {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* keep raw — already decoded or not percent-encoded */
  }

  if (!secret) {
    // cookie-parser only signs when a secret exists; without one the backend
    // sets the plain value. Fall back to a presence check (the API still
    // enforces its own auth, so this cannot grant data access).
    return value === 'true';
  }

  const prefix = 's:';
  if (!value.startsWith(prefix)) return false;
  const rest = value.slice(prefix.length);
  const dot = rest.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = rest.slice(0, dot);
  const signature = stripPadding(rest.slice(dot + 1));
  if (!payload || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = stripPadding(toBase64(mac));
  return timingSafeEqual(expected, signature);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const secret = process.env.SESSION_SECRET || '';

  if (pathname.startsWith('/api/academy/')) {
    const academyDbConfigError = getAcademyDatabaseConfigError();
    if (academyDbConfigError) {
      return NextResponse.json({ error: academyDbConfigError }, { status: 503 });
    }
    if (
      pathname === '/api/academy/programs' ||
      pathname === '/api/academy/register' ||
      pathname.startsWith('/api/academy/admin/') ||
      pathname.startsWith('/api/academy/staff/')
    ) {
      return NextResponse.next();
    }
  }

  // ── Academy Admin (MITA staff) ────────────────────────────────────────────
  // Gated with its own signed cookie (academy_staff). Public route: the login
  // page itself.
  if (pathname === '/academy/admin/login') {
    return NextResponse.next();
  }
  if (pathname === '/academy/admin' || pathname.startsWith('/academy/admin/')) {
    const valid = await signedCookieValid(request, 'academy_staff', secret);
    if (valid) return NextResponse.next();
    return redirect(request, '/academy/admin/login');
  }

  // ── Academy student portal ────────────────────────────────────────────────
  // Gated with its own signed cookie (academy_student). Public routes: the
  // landing page and the login/register pages.
  if (
    pathname === '/instructor/login' ||
    pathname === '/instructor/setup'
  ) {
    return NextResponse.next();
  }
  if (pathname === '/instructor' || pathname.startsWith('/instructor/')) {
    const valid = await signedCookieValid(request, 'academy_staff', secret);
    if (valid) return NextResponse.next();
    return redirect(request, '/instructor/login');
  }

  if (
    pathname === '/academy/login' ||
    pathname === '/academy/register' ||
    pathname === '/academy/terms' ||
    pathname === '/academy/privacy' ||
    pathname === '/academy'
  ) {
    return NextResponse.next();
  }
  if (pathname === '/academy' || pathname.startsWith('/academy/')) {
    const valid = await signedCookieValid(request, 'academy_student', secret);
    if (valid) return NextResponse.next();
    return redirect(request, '/academy/login');
  }

  // ── Site admin (existing gate, unchanged) ─────────────────────────────────
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const valid = await signedCookieValid(request, COOKIE_NAME, secret);

  if (valid) {
    return NextResponse.next();
  }

  return redirect(request, '/admin/login');
}

async function signedCookieValid(request, name, secret) {
  const raw = request.cookies.get(name)?.value || '';
  if (!raw) return false;
  return verifySignedCookie(raw, secret);
}

function redirect(request, path) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/academy/:path*', '/api/academy/:path*', '/instructor', '/instructor/:path*'],
};
