const crypto = require('crypto');
const net = require('net');

const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const STUDENT_LOGIN_MAX_ATTEMPTS = 5;
const STUDENT_LOGIN_IP_MAX_ATTEMPTS = 30;

function getClientIp(request) {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && net.isIP(realIp)) return realIp;

  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedIp && net.isIP(forwardedIp) ? forwardedIp : null;
}

function createStudentLoginRateLimitKeys({ studentId, clientIp, secret }) {
  if (!secret) throw new Error('SESSION_SECRET is required for student login rate limiting.');

  const identities = [
    { type: 'student', value: String(studentId || '').trim().toUpperCase(), limit: STUDENT_LOGIN_MAX_ATTEMPTS },
  ];
  if (clientIp) {
    identities.push({
      type: 'ip',
      value: clientIp,
      limit: STUDENT_LOGIN_IP_MAX_ATTEMPTS,
    });
  }

  return identities.map(({ type, value, limit }) => ({
    keyHash: crypto.createHmac('sha256', secret).update(`${type}\0${value}`).digest('hex'),
    limit,
    windowSeconds: LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  }));
}

module.exports = {
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  STUDENT_LOGIN_MAX_ATTEMPTS,
  STUDENT_LOGIN_IP_MAX_ATTEMPTS,
  getClientIp,
  createStudentLoginRateLimitKeys,
};
