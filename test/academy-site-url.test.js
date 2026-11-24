const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_ACADEMY_SITE_URL,
  getAcademySiteUrl,
  shouldRewriteAcademyRoot,
} = require('../lib/academy-site-url');

test('Academy URLs use the configured public origin', () => {
  const original = process.env.ACADEMY_SITE_URL;
  const originalPublic = process.env.NEXT_PUBLIC_ACADEMY_SITE_URL;
  try {
    process.env.ACADEMY_SITE_URL = 'https://academy.example.test/path/';
    process.env.NEXT_PUBLIC_ACADEMY_SITE_URL = 'https://ignored.example.test';
    assert.equal(getAcademySiteUrl(new Request('https://request.example.test')), 'https://academy.example.test');
  } finally {
    if (original === undefined) delete process.env.ACADEMY_SITE_URL;
    else process.env.ACADEMY_SITE_URL = original;
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_ACADEMY_SITE_URL;
    else process.env.NEXT_PUBLIC_ACADEMY_SITE_URL = originalPublic;
  }
});

test('Academy URLs default to the local request during development and Academy domain in production', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAcademyUrl = process.env.ACADEMY_SITE_URL;
  const originalPublicUrl = process.env.NEXT_PUBLIC_ACADEMY_SITE_URL;
  try {
    delete process.env.ACADEMY_SITE_URL;
    delete process.env.NEXT_PUBLIC_ACADEMY_SITE_URL;
    process.env.NODE_ENV = 'development';
    assert.equal(
      getAcademySiteUrl(new Request('http://localhost:3000/api/academy/register')),
      'http://localhost:3000'
    );
    process.env.NODE_ENV = 'production';
    assert.equal(getAcademySiteUrl(new Request('https://main.example.test/api/academy/register')), DEFAULT_ACADEMY_SITE_URL);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalAcademyUrl === undefined) delete process.env.ACADEMY_SITE_URL;
    else process.env.ACADEMY_SITE_URL = originalAcademyUrl;
    if (originalPublicUrl === undefined) delete process.env.NEXT_PUBLIC_ACADEMY_SITE_URL;
    else process.env.NEXT_PUBLIC_ACADEMY_SITE_URL = originalPublicUrl;
  }
});

test('only the Academy subdomain root is rewritten to the Academy landing page', () => {
  assert.equal(shouldRewriteAcademyRoot('academy.menositconsult.com', '/'), true);
  assert.equal(shouldRewriteAcademyRoot('ACADEMY.MENOSITCONSULT.COM', '/'), true);
  assert.equal(shouldRewriteAcademyRoot('menositconsult.com', '/'), false);
  assert.equal(shouldRewriteAcademyRoot('academy.menositconsult.com', '/login'), false);
});
