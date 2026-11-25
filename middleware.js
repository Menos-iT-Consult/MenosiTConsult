import { NextResponse } from 'next/server';
import { getAcademyDatabaseConfigError } from './lib/academy-db-config';
const { verifySignedCookie } = require('./lib/signed-cookie-verification');
const { isAcademyHostname, shouldRewriteAcademyRoot } = require('./lib/academy-site-url');

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
  '/api/academy/contact',
  '/api/academy/enrollments',
  '/api/academy/grades',
  '/api/academy/programs',
  '/api/academy/register',
  '/api/academy/site-settings',
  '/api/academy/submissions',
  '/api/academy/timetable',
]);

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const secret = process.env.SESSION_SECRET || '';
  const requestHostname = request.headers.get('host') || request.nextUrl.hostname;
  const academyHostname = isAcademyHostname(requestHostname);

  if (pathname === '/') {
    if (shouldRewriteAcademyRoot(requestHostname, pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/academy';
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (pathname === '/student') {
    if (await signedCookieValid(request, 'academy_student', secret)) {
      return redirect(request, '/academy/dashboard');
    }
    return rewrite(request, '/academy/login');
  }
  if (pathname === '/academy/login' && academyHostname) {
    return redirect(request, '/student');
  }

  if (pathname === '/admin' && academyHostname) {
    return rewrite(request, '/academy/admin/login');
  }
  if (pathname === '/academy/admin/login' && academyHostname) {
    return redirect(request, '/admin');
  }

  if (pathname === '/instructor') {
    return rewrite(request, '/instructor/login');
  }
  if (pathname === '/instructor/login') {
    return redirect(request, '/instructor');
  }
  if (pathname === '/contact') {
    if (academyHostname) return rewrite(request, '/academy/contact');
    return NextResponse.next();
  }

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
    return redirect(request, academyHostname ? '/admin' : '/academy/admin/login');
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
    return redirect(request, '/instructor');
  }

  if (
    pathname === '/academy/login' ||
    pathname === '/academy/register' ||
    pathname === '/academy/terms' ||
    pathname === '/academy/privacy' ||
    pathname === '/academy/contact' ||
    pathname === '/academy/verify' ||
    pathname.startsWith('/academy/verify/') ||
    pathname === '/academy'
  ) {
    return NextResponse.next();
  }
  if (pathname === '/academy' || pathname.startsWith('/academy/')) {
    const valid = await signedCookieValid(request, 'academy_student', secret);
    if (valid) return NextResponse.next();
    return redirect(request, academyHostname ? '/student' : '/academy/login');
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

function rewrite(request, path) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*', '/academy/:path*', '/api/academy/:path*', '/contact', '/instructor', '/instructor/:path*', '/student'],
};
