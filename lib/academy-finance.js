const MAX_AMOUNT = 999999999.99;

function normalizeAmount(value, { allowZero = true } = {}) {
  const text = typeof value === 'string' ? value.trim() : String(value);
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount > MAX_AMOUNT || (!allowZero && amount === 0)) return null;
  return amount;
}

function validateDiscount(discountType, discountValue) {
  const amount = normalizeAmount(discountValue, { allowZero: false });
  if (amount == null) return null;
  if (discountType === 'percentage' && amount <= 100) return amount;
  if (discountType === 'fixed') return amount;
  return null;
}

function normalizeProgramInput(body, { requirePublished = false } = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const durationSemesters = Number(body.durationSemesters);
  const feePerSemester = normalizeAmount(body.feePerSemester);
  if (
    !name || name.length > 120 || !/^[A-Z0-9-]{2,32}$/.test(code) ||
    description.length > 3000 ||
    !Number.isInteger(durationSemesters) || durationSemesters < 1 || durationSemesters > 20 ||
    feePerSemester == null ||
    (requirePublished && typeof body.published !== 'boolean') ||
    (body.published !== undefined && typeof body.published !== 'boolean')
  ) return null;
  return {
    name,
    code,
    description,
    durationSemesters,
    feeStructure: { feePerSemester, currency: 'GHS' },
    published: body.published !== false,
  };
}

function calculateSemesterFee(feePerSemester, scholarship) {
  const fee = normalizeAmount(feePerSemester);
  if (fee == null) return null;

  let discount = 0;
  if (scholarship) {
    if (scholarship.discountType === 'percentage') {
      discount = fee * Number(scholarship.discountValue) / 100;
    } else if (scholarship.discountType === 'fixed') {
      discount = Number(scholarship.discountValue);
    }
  }
  discount = Math.min(fee, Math.max(0, Math.round(discount * 100) / 100));
  return {
    currency: 'GHS',
    fee,
    scholarshipDiscount: discount,
    amountDue: Math.round((fee - discount) * 100) / 100,
  };
}

module.exports = {
  MAX_AMOUNT,
  normalizeAmount,
  validateDiscount,
  normalizeProgramInput,
  calculateSemesterFee,
};
