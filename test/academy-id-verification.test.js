const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QRCodeSVG } = require('qrcode.react');
const {
  createStudentIdVerificationToken,
  verifyStudentIdVerificationToken,
} = require('../lib/academy-id-verification');

const SECRET = 'a-long-test-secret-for-academy-id-qr-verification';

test('student ID verification tokens validate only when signed with the same secret', () => {
  const token = createStudentIdVerificationToken('MITA/IT-2026-0042', SECRET);
  const [payload, signature] = token.split('.');
  const tamperedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;

  assert.equal(verifyStudentIdVerificationToken(token, SECRET), 'MITA/IT-2026-0042');
  assert.equal(verifyStudentIdVerificationToken(token, `${SECRET}-different`), null);
  assert.equal(verifyStudentIdVerificationToken(`${payload}.${tamperedSignature}`, SECRET), null);
  assert.equal(verifyStudentIdVerificationToken('not-a-token', SECRET), null);
});

test('student ID verification tokens require a sufficiently strong secret', () => {
  assert.throws(
    () => createStudentIdVerificationToken('MITA/IT-2026-0042', 'short'),
    /32-character Academy ID verification secret/
  );
});

test('student ID verification URLs render as a machine-readable QR SVG', () => {
  const markup = renderToStaticMarkup(React.createElement(QRCodeSVG, {
    value: 'https://academy.example.test/academy/verify/verified-token',
    size: 128,
    marginSize: 4,
  }));

  assert.match(markup, /^<svg\b/);
  assert.match(markup, /<path\b/);
});
