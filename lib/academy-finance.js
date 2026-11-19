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

function normalizeScholarshipInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const programId = body.programId == null
    ? ''
    : typeof body.programId === 'string'
      ? body.programId.trim()
      : null;
  const discountType = body.discountType;
  const discountValue = validateDiscount(discountType, body.discountValue);
  if (
    !name || name.length > 120 || description.length > 1000 ||
    programId == null || discountValue == null
  ) return null;
  return { name, description, programId, discountType, discountValue };
}

function normalizeScholarshipApplicationInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const scholarshipId = typeof body.scholarshipId === 'string'
    ? body.scholarshipId.trim()
    : '';
  const statement = typeof body.statement === 'string' ? body.statement.trim() : '';
  if (!scholarshipId || scholarshipId.length > 160 || statement.length < 20 || statement.length > 2000) {
    return null;
  }
  return { scholarshipId, statement };
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
  normalizeScholarshipInput,
  normalizeScholarshipApplicationInput,
  normalizeProgramInput,
  calculateSemesterFee,
};
