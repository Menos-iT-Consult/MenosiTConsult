import { NextResponse } from 'next/server';
import { getAcademyDatabaseConfigError } from './lib/academy-db-config';
const { verifySignedCookie } = require('./lib/signed-cookie-verification');

/**
 * Auth gate for /admin.
 *
 * The Express backend sets a signed httpOnly cookie `admin_auth` via
 * cookie-parser + cookie-signature with secret SESSION_SECRET:
 *   raw value   = `s:<val>.<base64url-standard HMAC-SHA256 of <val>>`
 *   (cookie-signature strips trailing '=' padding from the base64 digest)
 *   cookie sent = encodeURIComponent(raw value)  → 's%3Atrue.XXXX'
 * Academy cookies use cookie-signature directly and omit the `s:` prefix.
 *
 * We verify both formats with edge-safe Web Crypto. Invalid signatures or a
 * missing cookie redirect to the relevant login page.
 *
 * NOTE: Next.js only loads middleware from the project root (or src/) —
 * `app/middleware.ts` is NOT picked up, hence this file's location.
 */

const COOKIE_NAME = 'admin_auth';
const ACADEMY_API_HANDLER_PREFIXES = [
  '/api/academy/admin/',
  '/api/academy/auth/',
  '/api/academy/instructor/',
  '/api/academy/staff/',
  '/api/academy/student/',
];
const ACADEMY_API_HANDLER_PATHS = new Set([
  '/api/academy/assignments',
  '/api/academy/enrollments',
  '/api/academy/grades',
  '/api/academy/programs',
  '/api/academy/register',
  '/api/academy/submissions',
]);

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const secret = process.env.SESSION_SECRET || '';

  if (pathname.startsWith('/api/academy/')) {
    const academyDbConfigError = getAcademyDatabaseConfigError();
    if (academyDbConfigError) {
      return NextResponse.json({ error: academyDbConfigError }, { status: 503 });
    }
    // Let Academy handlers return their own JSON auth responses instead of
    // redirecting API calls to the site-admin login page.
    if (
      ACADEMY_API_HANDLER_PATHS.has(pathname) ||
      ACADEMY_API_HANDLER_PREFIXES.some((prefix) => pathname.startsWith(prefix))
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
    pathname === '/academy/verify' ||
    pathname.startsWith('/academy/verify/') ||
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
