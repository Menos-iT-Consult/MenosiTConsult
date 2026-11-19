const crypto = require('crypto');

const MIN_SECRET_BYTES = 32;

function getSecret(secret) {
  const value = secret || process.env.ACADEMY_ID_VERIFICATION_SECRET || process.env.SESSION_SECRET || '';
  if (Buffer.byteLength(value) < MIN_SECRET_BYTES) {
    const error = new Error('A 32-character Academy ID verification secret is required.');
    error.code = 'ACADEMY_ID_VERIFICATION_SECRET';
    throw error;
  }
  return value;
}

function createStudentIdVerificationToken(studentId, secret) {
  if (typeof studentId !== 'string' || !studentId.trim() || studentId.length > 100) {
    throw new Error('A valid Student ID is required.');
  }
  const payload = Buffer.from(studentId, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSecret(secret))
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifyStudentIdVerificationToken(token, secret) {
  if (typeof token !== 'string' || token.length > 512) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) ||
      !/^[A-Za-z0-9_-]{43}$/.test(parts[1])) {
    return null;
  }

  const expected = crypto
    .createHmac('sha256', getSecret(secret))
    .update(parts[0])
    .digest();
  const supplied = Buffer.from(parts[1], 'base64url');
  if (supplied.length !== expected.length ||
      supplied.toString('base64url') !== parts[1] ||
      !crypto.timingSafeEqual(supplied, expected)) {
    return null;
  }

  const studentId = Buffer.from(parts[0], 'base64url').toString('utf8');
  if (!studentId || studentId.length > 100 ||
      Buffer.from(studentId, 'utf8').toString('base64url') !== parts[0]) {
    return null;
  }
  return studentId;
}

module.exports = {
  createStudentIdVerificationToken,
  verifyStudentIdVerificationToken,
};
