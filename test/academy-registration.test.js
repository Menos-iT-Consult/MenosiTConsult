const test = require('node:test');
const assert = require('node:assert/strict');
const {
  COUNTRIES,
  getCountryCallingCode,
  getCountryRegions,
  isCountry,
  isGender,
  isRegionForCountry,
  normalizePhoneNumber,
} = require('../lib/academy-registration');

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

test('Academy contact details resolve country calling codes and regions', () => {
  assert.equal(getCountryCallingCode('Ghana'), '+233');
  assert.equal(getCountryCallingCode('Antigua & Barbuda'), '+1268');
  assert.equal(getCountryCallingCode('Åland Islands'), '+358');
  assert.ok(getCountryRegions('United States').includes('California'));
  assert.equal(isRegionForCountry('United States', 'California'), true);
  assert.equal(isRegionForCountry('United States', 'Ontario'), false);
  assert.equal(isRegionForCountry('Svalbard & Jan Mayen', ''), true);
});

test('every selectable Academy country has a calling code', () => {
  assert.ok(COUNTRIES.every((country) => getCountryCallingCode(country)));
});

test('phone numbers are validated for the selected country and normalized to international format', () => {
  assert.equal(normalizePhoneNumber('024 123 4567', 'Ghana'), '+233241234567');
  assert.equal(normalizePhoneNumber('+1 415 555 2671', 'United States'), '+14155552671');
  assert.equal(normalizePhoneNumber('12345', 'Ghana'), null);
  assert.equal(normalizePhoneNumber('+44 20 7183 8750', 'Ghana'), null);
  assert.equal(normalizePhoneNumber('', 'Ghana'), null);
});
