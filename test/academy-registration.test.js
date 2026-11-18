const test = require('node:test');
const assert = require('node:assert/strict');
const { COUNTRIES, isCountry, isGender } = require('../lib/academy-registration');

test('Academy registration accepts the country list and rejects free-form values', () => {
  assert.ok(COUNTRIES.length >= 240);
  assert.equal(new Set(COUNTRIES).size, COUNTRIES.length);
  assert.equal(isCountry('Ghana'), true);
  assert.equal(isCountry('United States'), true);
  assert.equal(isCountry('Ghanaian'), false);
  assert.equal(isCountry(''), false);
});

test('Academy registration requires one of the two supported genders', () => {
  assert.equal(isGender('Female'), true);
  assert.equal(isGender('Male'), true);
  assert.equal(isGender(''), false);
  assert.equal(isGender('Non-binary'), false);
  assert.equal(isGender('Other'), false);
});
