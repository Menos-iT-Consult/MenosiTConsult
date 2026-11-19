const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAmount,
  validateDiscount,
  normalizeProgramInput,
  calculateSemesterFee,
} = require('../lib/academy-finance');

test('validates fee amounts and scholarship discounts', () => {
  assert.equal(normalizeAmount('1200.50'), 1200.5);
  assert.equal(normalizeAmount('-1'), null);
  assert.equal(normalizeAmount('12.345'), null);
  assert.equal(validateDiscount('percentage', '100'), 100);
  assert.equal(validateDiscount('percentage', '100.01'), null);
  assert.equal(validateDiscount('fixed', '0'), null);
});

test('validates administrator program setup and per-semester tuition', () => {
  assert.deepEqual(normalizeProgramInput({
    name: 'Network Engineering',
    code: 'net',
    description: '',
    durationSemesters: 4,
    feePerSemester: '1250.00',
  }), {
    name: 'Network Engineering',
    code: 'NET',
    description: '',
    durationSemesters: 4,
    feeStructure: { feePerSemester: 1250, currency: 'GHS' },
    published: true,
  });
  assert.equal(normalizeProgramInput({
    name: 'Invalid',
    code: 'BAD',
    durationSemesters: 4,
    feePerSemester: '-1',
  }), null);
});

test('calculates percentage and capped fixed scholarship amounts', () => {
  assert.deepEqual(
    calculateSemesterFee(1000, { discountType: 'percentage', discountValue: 25 }),
    { currency: 'GHS', fee: 1000, scholarshipDiscount: 250, amountDue: 750 }
  );
  assert.deepEqual(
    calculateSemesterFee(100, { discountType: 'fixed', discountValue: 120 }),
    { currency: 'GHS', fee: 100, scholarshipDiscount: 100, amountDue: 0 }
  );
});
