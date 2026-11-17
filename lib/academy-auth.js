const { sign, unsign } = require('cookie-signature');

/**
 * Academy auth cookie helpers.
 *
 * Two independent httpOnly signed cookies carry academy sessions (both signed
 * with the shared SESSION_SECRET, using the same cookie-signature format as
 * the site admin cookie):
 *   academy_student  → signed student row id  (gates /academy/* portal pages)
 *   academy_staff    → signed staff row id    (gates /academy/admin/*)
 *
 * The value is the row id (not a literal flag) so route handlers can look the
 * account up; role checks (admin vs instructor) are always done server-side
 * against the DB — never trusted from the cookie.
 */

const STUDENT_COOKIE = 'academy_student';
const STAFF_COOKIE = 'academy_staff';

// Student portal sessions: 7 days. Staff sessions: 12 hours.
const STUDENT_MAX_AGE = 7 * 24 * 60 * 60;
const STAFF_MAX_AGE = 12 * 60 * 60;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/** Sets a signed academy session cookie on a NextResponse. */
function setAcademyCookie(response, name, value, maxAge) {
  const secret = process.env.SESSION_SECRET;
  response.cookies.set({
    name,
    value: sign(String(value), secret),
    maxAge,
    ...COOKIE_OPTIONS,
  });
  return response;
}

function clearAcademyCookie(response, name) {
  response.cookies.set({ name, value: '', maxAge: 0, ...COOKIE_OPTIONS });
  return response;
}

/**
 * Returns the unsigned cookie payload for `name`, or null.
 * Like cookie-parser, an unsigned/badly-signed value is never trusted.
 */
function readAcademyCookie(request, name) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const cookie = request.cookies.get(name);
  if (!cookie) return null;
  const value = unsign(cookie.value, secret);
  return value === false ? null : value;
}

/** Signed student id, or null. */
function getStudentId(request) {
  return readAcademyCookie(request, STUDENT_COOKIE);
}

/** Signed staff id, or null. */
function getStaffId(request) {
  return readAcademyCookie(request, STAFF_COOKIE);
}

module.exports = {
  STUDENT_COOKIE,
  STAFF_COOKIE,
  STUDENT_MAX_AGE,
  STAFF_MAX_AGE,
  COOKIE_OPTIONS,
  setAcademyCookie,
  clearAcademyCookie,
  readAcademyCookie,
  getStudentId,
  getStaffId,
};
