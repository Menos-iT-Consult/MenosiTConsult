const { unsign } = require('cookie-signature');

// Mirrors backend/middleware/auth.js: cookie-parser only trusts the signed
// cookie when it unsigns (with SESSION_SECRET) to the literal 'true'.
// No secret configured -> signed cookies are never trusted (same as
// cookie-parser, which skips signedCookies without a secret).
async function requireAuth(request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const value = request.cookies.get('admin_auth')
    ? request.cookies.get('admin_auth').value
    : undefined;
  if (!value) return false;
  return unsign(value, secret) === 'true';
}

module.exports = { requireAuth };
