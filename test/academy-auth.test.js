const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const ensureAcademySchema = require('../backend/academy-schema');
const { verifyAcademyPassword } = require('../lib/academy-password');
const {
  LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  STUDENT_LOGIN_MAX_ATTEMPTS,
  STUDENT_LOGIN_IP_MAX_ATTEMPTS,
  createStudentLoginRateLimitKeys,
  getClientIp,
} = require('../lib/academy-login-rate-limit');

test('Academy password verification awaits bcrypt and rejects incorrect passwords', async () => {
  const hash = bcrypt.hashSync('correct-password', 4);

  assert.equal(await verifyAcademyPassword('correct-password', hash), true);
  assert.equal(await verifyAcademyPassword('incorrect-password', hash), false);
  assert.equal(await verifyAcademyPassword('correct-password', ''), false);
});

test('student login rate limits are keyed by private hashes for student and client IP', () => {
  const keys = createStudentLoginRateLimitKeys({
    studentId: 'mita/net-2026-001',
    clientIp: '203.0.113.42',
    secret: 'test-secret',
  });

  assert.equal(keys.length, 2);
  assert.deepEqual(keys.map(({ limit }) => limit), [
    STUDENT_LOGIN_MAX_ATTEMPTS,
    STUDENT_LOGIN_IP_MAX_ATTEMPTS,
  ]);
  assert.equal(keys[0].windowSeconds, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
  assert.notEqual(keys[0].keyHash, keys[1].keyHash);
  assert.ok(keys.every(({ keyHash }) => /^[a-f0-9]{64}$/.test(keyHash)));
  assert.ok(keys.every(({ keyHash }) => !keyHash.includes('NET')));
  assert.throws(() => createStudentLoginRateLimitKeys({
    studentId: 'MITA/NET-2026-001',
    clientIp: null,
    secret: '',
  }), /SESSION_SECRET/);
});

test('student login rate limiting trusts valid proxy IP headers and ignores malformed addresses', () => {
  assert.equal(getClientIp(new Request('https://academy.example.test', {
    headers: {
      'x-real-ip': '203.0.113.42',
      'x-forwarded-for': '198.51.100.8',
    },
  })), '203.0.113.42');
  assert.equal(getClientIp(new Request('https://academy.example.test', {
    headers: { 'x-forwarded-for': '2001:db8::1, 198.51.100.8' },
  })), '2001:db8::1');
  assert.equal(getClientIp(new Request('https://academy.example.test', {
    headers: { 'x-real-ip': 'spoofed', 'x-forwarded-for': 'also-spoofed' },
  })), null);
});

test('Academy schema creates persistent login rate-limit storage', async () => {
  const queries = [];
  await ensureAcademySchema(async (query) => {
    queries.push(query);
  });

  assert.ok(queries.some((query) => query.includes('CREATE TABLE IF NOT EXISTS academy_login_rate_limits')));
  assert.ok(queries.some((query) => query.includes('academy_login_rate_limits_updated_at')));
});
