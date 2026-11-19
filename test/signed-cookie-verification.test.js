const test = require('node:test');
const assert = require('node:assert/strict');
const { sign } = require('cookie-signature');
const { verifySignedCookie } = require('../lib/signed-cookie-verification');

const SECRET = 'middleware-cookie-test-secret';

test('verifies raw cookie-signature values used by Academy staff cookies', async () => {
  const cookie = sign('academy-staff-id', SECRET);

  assert.equal(cookie.startsWith('s:'), false);
  assert.equal(await verifySignedCookie(cookie, SECRET), true);
  assert.equal(await verifySignedCookie(encodeURIComponent(cookie), SECRET), true);
});

test('continues verifying cookie-parser values and rejects invalid signatures', async () => {
  const cookie = `s:${sign('true', SECRET)}`;

  assert.equal(await verifySignedCookie(cookie, SECRET), true);
  assert.equal(await verifySignedCookie(cookie, 'incorrect-secret'), false);
  assert.equal(await verifySignedCookie('academy-staff-id', SECRET), false);
});
