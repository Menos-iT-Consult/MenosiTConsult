const crypto = require('crypto');
const net = require('net');

const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const STUDENT_LOGIN_MAX_ATTEMPTS = 5;
const STUDENT_LOGIN_IP_MAX_ATTEMPTS = 30;
const STAFF_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;

function hmacKey(secret, type, value) {
  if (!secret) throw new Error('SESSION_SECRET is required for login rate limiting.');
  return crypto.createHmac('sha256', secret).update(`${type}\0${value}`).digest('hex');
}

function getClientIp(request) {
  const headers = request.headers;
  const getHeader = (name) => typeof headers?.get === 'function'
    ? headers.get(name)
    : headers?.[name];
  const realIpValue = getHeader('x-real-ip');
  const realIp = Array.isArray(realIpValue) ? realIpValue[0]?.trim() : String(realIpValue || '').trim();
  if (realIp && net.isIP(realIp)) return realIp;

  const forwardedValue = getHeader('x-forwarded-for');
  const forwardedIp = (Array.isArray(forwardedValue) ? forwardedValue[0] : String(forwardedValue || ''))
    .split(',')[0]?.trim();
  return forwardedIp && net.isIP(forwardedIp) ? forwardedIp : null;
}

function createStudentLoginRateLimitKeys({ studentId, clientIp, secret }) {
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
    keyHash: hmacKey(secret, type, value),
    limit,
    windowSeconds: LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  }));
}

function createLoginProtectionKeys({ accountType, account, clientIp, secret }) {
  if (!accountType || !['student', 'staff', 'admin'].includes(accountType)) {
    throw new Error('A supported account type is required for login rate limiting.');
  }

  const normalizedAccount = String(account || '').trim().toLowerCase();
  const accountLimit = accountType === 'student'
    ? STUDENT_LOGIN_MAX_ATTEMPTS
    : accountType === 'staff'
      ? STAFF_LOGIN_MAX_ATTEMPTS
      : ADMIN_LOGIN_MAX_ATTEMPTS;

  const identities = [
    { type: `${accountType}:account`, value: normalizedAccount, limit: accountLimit },
  ];
  if (clientIp) {
    identities.push({
      type: `${accountType}:ip`,
      value: clientIp,
      limit: STUDENT_LOGIN_IP_MAX_ATTEMPTS,
    });
  }

  return identities.map(({ type, value, limit }) => ({
    keyHash: hmacKey(secret, type, value),
    limit,
    windowSeconds: LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  }));
}

function loginProtectionResponse(retryAfterSeconds) {
  const seconds = Math.max(1, Number(retryAfterSeconds) || 1);
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return {
    seconds,
    message: `Too many sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
  };
}

module.exports = {
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  STUDENT_LOGIN_MAX_ATTEMPTS,
  STUDENT_LOGIN_IP_MAX_ATTEMPTS,
  STAFF_LOGIN_MAX_ATTEMPTS,
  ADMIN_LOGIN_MAX_ATTEMPTS,
  getClientIp,
  createStudentLoginRateLimitKeys,
  createLoginProtectionKeys,
  loginProtectionResponse,
};
