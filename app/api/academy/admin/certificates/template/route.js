import { NextResponse } from 'next/server';

const academy = require('../../../../../../backend/academy-db');
const staffAuth = require('../../../../../../lib/academy-staff');
const storage = require('../../../../../../backend/academy-r2');
const {
  REQUIRED_FIELDS,
  TEMPLATE_SETTING_KEY,
  validateCertificateTemplate,
} = require('../../../../../../lib/academy-certificates');
const { noDbErrorResponse } = require('../../../../../../lib/api-helpers');

function publicTemplate(value) {
  if (!value || typeof value !== 'object') return null;
  return {
    fileName: value.fileName,
    uploadedAt: value.uploadedAt,
    fields: REQUIRED_FIELDS,
  };
}

export async function GET(request) {
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const template = await academy.getAcademySetting(TEMPLATE_SETTING_KEY);
    return NextResponse.json({ template: publicTemplate(template) });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    console.error('Academy certificate template lookup error:', error);
    return NextResponse.json({ error: 'Could not load certificate template settings.' }, { status: 500 });
  }
}

export async function POST(request) {
  let uploadedKey = '';
  try {
    const gate = await staffAuth.requireAdministrator(request);
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });
    if (!storage.certificateStorageEnabled()) {
      return NextResponse.json({ error: 'Private Academy certificate storage is not configured.' }, { status: 503 });
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Upload a certificate template as a PDF file.' }, { status: 400 });
    }
    const file = formData.get('template');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Choose a certificate template PDF to upload.' }, { status: 400 });
    }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'The certificate template must be a PDF file.' }, { status: 400 });
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'The certificate template must be no larger than 10 MB.' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    await validateCertificateTemplate(bytes);
    const stored = await storage.putPrivatePdf(bytes, 'templates');
    uploadedKey = stored.key;
    const template = {
      key: stored.key,
      fileName: file.name.slice(0, 180),
      uploadedAt: new Date().toISOString(),
    };
    try {
      await academy.setAcademySetting(TEMPLATE_SETTING_KEY, template);
    } catch (error) {
      try {
        await storage.deletePrivatePdf(uploadedKey);
      } catch (cleanupError) {
        console.error('Academy certificate template cleanup failed:', cleanupError);
      }
      throw error;
    }
    return NextResponse.json({ template: publicTemplate(template) });
  } catch (error) {
    const noDb = noDbErrorResponse(error);
    if (noDb) return noDb;
    if (error.message && /certificate template|PDF|fillable fields|text fields/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Academy certificate template upload error:', error);
    return NextResponse.json({ error: 'Could not save the certificate template.' }, { status: 500 });
  }
}
