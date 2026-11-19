const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStudentSubmission } = require('../lib/academy-submissions');

test('accepts a text response, a public resource URL, or both', () => {
  assert.equal(validateStudentSubmission('My answer', ''), null);
  assert.equal(validateStudentSubmission('', 'https://files.example.test/work.pdf'), null);
  assert.equal(validateStudentSubmission('My answer', 'https://files.example.test/work.pdf'), null);
});

test('rejects empty or oversized submission content and unsafe URLs', () => {
  assert.match(validateStudentSubmission('', ''), /Add a text response/);
  assert.match(validateStudentSubmission('x'.repeat(20001), ''), /20,000 characters/);
  assert.match(validateStudentSubmission('', 'javascript:alert(1)'), /HTTP or HTTPS/);
  assert.match(validateStudentSubmission('', 'https://user:pass@example.test/file'), /cannot contain credentials/);
});
