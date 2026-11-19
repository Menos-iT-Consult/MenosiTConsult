const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_PASSPORT_PHOTO_SIZE,
  validatePassportPhoto,
} = require('../lib/academy-passport-photo');

test('passport photos accept matching JPEG, PNG, and WebP signatures', () => {
  assert.equal(validatePassportPhoto(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg'), '');
  assert.equal(
    validatePassportPhoto(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'),
    ''
  );
  assert.equal(
    validatePassportPhoto(Buffer.from('RIFF0000WEBP'), 'image/webp'),
    ''
  );
});

test('passport photo validation rejects empty, unsupported, spoofed, and oversized uploads', () => {
  assert.match(validatePassportPhoto(Buffer.alloc(0), 'image/jpeg'), /required/);
  assert.match(validatePassportPhoto(Buffer.from('GIF89a'), 'image/gif'), /JPEG, PNG, or WebP/);
  assert.match(validatePassportPhoto(Buffer.from('not a jpeg'), 'image/jpeg'), /does not match/);
  assert.match(
    validatePassportPhoto(Buffer.alloc(MAX_PASSPORT_PHOTO_SIZE + 1), 'image/png'),
    /5 MB or smaller/
  );
});
