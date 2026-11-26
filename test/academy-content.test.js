const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_ACADEMY_FILE_SIZE,
  normalizeMaterialLink,
  validateCourseMaterialFile,
  materialDownloadUrl,
} = require('../lib/academy-content');

test('lesson links require a valid HTTPS URL and bounded title', () => {
  assert.deepEqual(normalizeMaterialLink('Reference', 'https://example.com/lesson'), {
    title: 'Reference',
    kind: 'link',
    url: 'https://example.com/lesson',
  });
  assert.equal(normalizeMaterialLink('Reference', 'javascript:alert(1)'), null);
  assert.equal(normalizeMaterialLink('', 'https://example.com').title, 'example.com');
});

test('course material uploads require supported matching file types and signatures', () => {
  const pdf = Buffer.from('%PDF-1.7\nexample');
  assert.equal(validateCourseMaterialFile('week 1.pdf', 'application/pdf', pdf).extension, 'pdf');
  assert.equal(validateCourseMaterialFile('week 1.pdf', 'application/pdf', Buffer.from('not pdf')), null);
  assert.equal(validateCourseMaterialFile('week 1.exe', 'application/pdf', pdf), null);
  assert.equal(validateCourseMaterialFile('slides.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', Buffer.from([0x50, 0x4b, 0x03, 0x04])).extension, 'pptx');
  assert.equal(validateCourseMaterialFile('bad.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', Buffer.from('no')), null);
  assert.equal(validateCourseMaterialFile('photo.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00])).extension, 'jpg');
  assert.equal(validateCourseMaterialFile('photo.jpeg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff])).extension, 'jpg');
  assert.equal(validateCourseMaterialFile('photo.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).extension, 'png');
  assert.equal(validateCourseMaterialFile('photo.webp', 'image/webp', Buffer.from('RIFF0000WEBP')).extension, 'webp');
  assert.equal(validateCourseMaterialFile('photo.jpg', 'image/jpeg', Buffer.from('not an image')), null);
  assert.equal(validateCourseMaterialFile('photo.gif', 'image/gif', Buffer.from('GIF89a')), null);
});

test('course materials accept files up to 10 MB and reject larger files', () => {
  const signature = Buffer.from([0xff, 0xd8, 0xff]);
  const maxFile = Buffer.concat([signature, Buffer.alloc(MAX_ACADEMY_FILE_SIZE - signature.length)]);
  const oversizedFile = Buffer.concat([maxFile, Buffer.from([0x00])]);
  assert.equal(validateCourseMaterialFile('large.jpg', 'image/jpeg', maxFile).size, MAX_ACADEMY_FILE_SIZE);
  assert.equal(validateCourseMaterialFile('large.jpg', 'image/jpeg', oversizedFile), null);
});

test('material download paths encode opaque lesson and material IDs', () => {
  assert.equal(
    materialDownloadUrl('lesson/1', 'file 2'),
    '/api/academy/lessons/lesson%2F1/materials/file%202'
  );
});
