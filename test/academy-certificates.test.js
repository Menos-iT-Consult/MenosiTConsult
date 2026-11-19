const test = require('node:test');
const assert = require('node:assert/strict');
const { PDFDocument } = require('pdf-lib');
const {
  REQUIRED_FIELDS,
  MAX_TEMPLATE_BYTES,
  validateCertificateTemplate,
  createCertificatePdf,
} = require('../lib/academy-certificates');

async function makeTemplate(fields = REQUIRED_FIELDS) {
  const document = await PDFDocument.create();
  document.addPage();
  const form = document.getForm();
  for (const name of fields) form.createTextField(name);
  return Buffer.from(await document.save());
}

test('validates required fillable certificate text fields', async () => {
  const template = await makeTemplate();
  await assert.doesNotReject(() => validateCertificateTemplate(template));
  await assert.rejects(
    async () => validateCertificateTemplate(await makeTemplate(REQUIRED_FIELDS.slice(1))),
    /student_name/
  );
  await assert.rejects(
    () => validateCertificateTemplate(Buffer.from('not a pdf')),
    /not a valid PDF/
  );
  await assert.rejects(
    () => validateCertificateTemplate(Buffer.alloc(MAX_TEMPLATE_BYTES + 1)),
    /no larger than 10 MB/
  );
});

test('fills and flattens the completed certificate PDF', async () => {
  const template = await makeTemplate();
  const completed = await createCertificatePdf(template, {
    student_name: 'Ada Student',
    program_name: 'Network Engineering',
    issue_date: '2026-03-20',
    certificate_number: 'MITA-CERT-2026-ABC123',
  });
  const document = await PDFDocument.load(completed);
  assert.equal(document.getPageCount(), 1);
  assert.equal(document.getForm().getFields().length, 0);
});

test('rejects empty values when generating a certificate', async () => {
  const template = await makeTemplate();
  await assert.rejects(
    () => createCertificatePdf(template, {
      student_name: 'Ada Student',
      program_name: 'Network Engineering',
      issue_date: '',
      certificate_number: 'MITA-CERT-2026-ABC123',
    }),
    /issue_date/
  );
});
