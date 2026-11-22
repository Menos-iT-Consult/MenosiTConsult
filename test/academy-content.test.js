const test = require('node:test');
const assert = require('node:assert/strict');
const {
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
});

test('material download paths encode opaque lesson and material IDs', () => {
  assert.equal(
    materialDownloadUrl('lesson/1', 'file 2'),
    '/api/academy/lessons/lesson%2F1/materials/file%202'
  );
});
