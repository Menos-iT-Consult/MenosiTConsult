const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_ACADEMY_SITE_SETTINGS,
  normalizeAcademySiteSettings,
  validateAcademySiteSettings,
} = require('../lib/academy-site-settings');

test('Academy site settings fill missing values from defaults', () => {
  assert.deepEqual(normalizeAcademySiteSettings({ email: '  academy@example.com ' }), {
    ...DEFAULT_ACADEMY_SITE_SETTINGS,
    email: 'academy@example.com',
  });
});

test('Academy site settings require a valid email and HTTPS social URLs', () => {
  assert.match(validateAcademySiteSettings({ email: 'not-an-email' }).error, /valid Academy contact email/);
  assert.match(
    validateAcademySiteSettings({ ...DEFAULT_ACADEMY_SITE_SETTINGS, email: 123 }).error,
    /text value for email/
  );
  assert.match(
    validateAcademySiteSettings({ ...DEFAULT_ACADEMY_SITE_SETTINGS, instagram: 'javascript:alert(1)' }).error,
    /valid HTTPS URL/
  );
  assert.equal(
    validateAcademySiteSettings({ ...DEFAULT_ACADEMY_SITE_SETTINGS, instagram: '' }).settings.instagram,
    ''
  );
});
