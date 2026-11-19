const { PDFDocument, PDFTextField } = require('pdf-lib');

const REQUIRED_FIELDS = [
  'student_name',
  'program_name',
  'issue_date',
  'certificate_number',
];
const MAX_TEMPLATE_BYTES = 10 * 1024 * 1024;
const TEMPLATE_SETTING_KEY = 'academy_certificate_template';

async function validateCertificateTemplate(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_TEMPLATE_BYTES) {
    throw new Error('The certificate template must be a non-empty PDF no larger than 10 MB.');
  }
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw new Error('The uploaded certificate template is not a valid PDF.');
  }

  let document;
  try {
    document = await PDFDocument.load(bytes);
  } catch {
    throw new Error('The uploaded certificate template could not be opened as a PDF.');
  }

  const form = document.getForm();
  const fields = new Map(form.getFields().map((field) => [field.getName(), field]));
  const missing = REQUIRED_FIELDS.filter((name) => !fields.has(name));
  if (missing.length) {
    throw new Error(`The PDF is missing required fillable fields: ${missing.join(', ')}.`);
  }
  const nonText = REQUIRED_FIELDS.filter((name) => !(fields.get(name) instanceof PDFTextField));
  if (nonText.length) {
    throw new Error(`These required PDF fields must be text fields: ${nonText.join(', ')}.`);
  }
  return document;
}

async function createCertificatePdf(templateBytes, values) {
  const document = await validateCertificateTemplate(templateBytes);
  const form = document.getForm();
  for (const name of REQUIRED_FIELDS) {
    const value = values[name];
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`A value is required for certificate field ${name}.`);
    }
    form.getTextField(name).setText(value.trim());
  }
  form.flatten();
  return Buffer.from(await document.save());
}

module.exports = {
  REQUIRED_FIELDS,
  MAX_TEMPLATE_BYTES,
  TEMPLATE_SETTING_KEY,
  validateCertificateTemplate,
  createCertificatePdf,
};
