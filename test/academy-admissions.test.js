const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isAdmissionsOpen,
  validateAdmissionsStatus,
} = require('../lib/academy-admissions');

test('admissions remain open by default and close only when explicitly disabled', () => {
  assert.equal(isAdmissionsOpen(null), true);
  assert.equal(isAdmissionsOpen(true), true);
  assert.equal(isAdmissionsOpen(false), false);
});

test('admissions status updates require an explicit boolean', () => {
  assert.deepEqual(validateAdmissionsStatus({ admissionsOpen: false }), { admissionsOpen: false });
  assert.deepEqual(validateAdmissionsStatus({ admissionsOpen: true }), { admissionsOpen: true });
  assert.match(validateAdmissionsStatus({}).error, /open or closed/);
  assert.match(validateAdmissionsStatus({ admissionsOpen: 'false' }).error, /open or closed/);
});
