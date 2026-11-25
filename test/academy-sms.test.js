const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getMnotifyConfigurationError,
  normalizeGhanaRecipient,
  normalizeInternationalRecipient,
  normalizeAcademyPhone,
  normalizeQuickRecipient,
  sendAcademySms,
  sendAdmissionSms,
} = require('../lib/academy-sms');

const configuredEnvironment = {
  ACADEMY_MNOTIFY_API_KEY: 'test-api-key',
  ACADEMY_MNOTIFY_SENDER: 'MITAACADEMY',
};

test('normalizes Ghana phone numbers for mNotify quick SMS', () => {
  assert.equal(normalizeGhanaRecipient('024 123 4567'), '0241234567');
  assert.equal(normalizeGhanaRecipient('+233 24 123 4567'), '0241234567');
  assert.equal(normalizeGhanaRecipient('2330241234567'), '0241234567');
  assert.equal(normalizeGhanaRecipient('241234567'), '0241234567');
  assert.equal(normalizeGhanaRecipient('+1 415 555 2671'), null);
});

test('normalizes international recipients and keeps mNotify regional countries on quick SMS', () => {
  assert.equal(normalizeInternationalRecipient('+1 415 555 2671'), '14155552671');
  assert.equal(normalizeInternationalRecipient('+233 24 123 4567'), null);
  assert.equal(normalizeInternationalRecipient('4155552671'), null);
  assert.equal(normalizeAcademyPhone('+1 (415) 555-2671'), '+14155552671');
  assert.equal(normalizeAcademyPhone('024 123 4567'), '0241234567');
  assert.equal(normalizeAcademyPhone('+999 1234 5678'), null);
  assert.equal(normalizeQuickRecipient('+221 77 123 45 67'), '221771234567');
  assert.equal(normalizeQuickRecipient('+225 07 07 12 34 56'), '2250707123456');
});

test('requires a configured API key and a sender ID within mNotify limits', () => {
  assert.match(getMnotifyConfigurationError({}), /ACADEMY_MNOTIFY_API_KEY/);
  assert.match(
    getMnotifyConfigurationError({ ...configuredEnvironment, ACADEMY_MNOTIFY_SENDER: 'TOO-LONG-SENDER' }),
    /approved sender ID/
  );
  assert.equal(getMnotifyConfigurationError(configuredEnvironment), null);
});

test('sends admission credentials through mNotify quick SMS and records the campaign ID', async () => {
  let capturedUrl;
  let capturedRequest;
  const result = await sendAdmissionSms({
    student: {
      firstName: 'Ama',
      phone: '+233 24 123 4567',
      studentId: 'MITA/ICT-2026-0001',
    },
    portalUrl: 'https://academy.example.test/academy/login',
    env: configuredEnvironment,
    fetchImpl: async (url, request) => {
      capturedUrl = new URL(url);
      capturedRequest = request;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          summary: { _id: 'campaign-1', total_sent: 1 },
        }),
      };
    },
  });

  assert.deepEqual(result, { ok: true, campaignId: 'campaign-1' });
  assert.equal(capturedUrl.origin, 'https://api.mnotify.com');
  assert.equal(capturedUrl.pathname, '/api/sms/quick');
  assert.equal(capturedUrl.searchParams.get('key'), 'test-api-key');
  assert.equal(capturedRequest.method, 'POST');
  assert.deepEqual(JSON.parse(capturedRequest.body), {
    recipient: ['0241234567'],
    sender: 'MITAACADEMY',
    message: 'Congratulations Ama, your MITA Academy admission is approved. Student ID: MITA/ICT-2026-0001. Temporary password: MITA/ICT-2026-0001. Sign in at https://academy.example.test/academy/login and change your password on first login.',
    is_schedule: false,
    schedule_date: '',
  });
  assert.equal(Object.hasOwn(JSON.parse(capturedRequest.body), 'sms_type'), false);
});

test('reports mNotify rejections for Ghana quick SMS', async () => {
  const providerFailure = await sendAdmissionSms({
    student: { firstName: 'Ama', phone: '0241234567', studentId: 'MITA/ICT-2026-0001' },
    portalUrl: 'https://academy.example.test/academy/login',
    env: configuredEnvironment,
    fetchImpl: async () => ({
      ok: false,
      status: 422,
      json: async () => ({ status: 'error', message: 'No local recipients.' }),
    }),
  });
  assert.deepEqual(providerFailure, { ok: false, error: 'No local recipients.' });
});

test('sends international admission SMS through the configured mNotify template', async () => {
  let capturedUrl;
  let capturedRequest;
  const result = await sendAdmissionSms({
    student: {
      firstName: 'Ama',
      phone: '+1 415 555 2671',
      studentId: 'MITA/ICT-2026-0001',
    },
    portalUrl: 'https://academy.example.test/academy/login',
    env: {
      ...configuredEnvironment,
      ACADEMY_MNOTIFY_INTERNATIONAL_TEMPLATE_ID: 'template_123',
    },
    fetchImpl: async (url, request) => {
      capturedUrl = new URL(url);
      capturedRequest = request;
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'success', summary: { _id: 'campaign-intl', total_sent: 1 } }),
      };
    },
  });

  assert.deepEqual(result, { ok: true, campaignId: 'campaign-intl' });
  assert.equal(capturedUrl.pathname, '/api/template/send/template_123');
  assert.equal(capturedUrl.searchParams.get('key'), 'test-api-key');
  assert.deepEqual(JSON.parse(capturedRequest.body), {
    recipient: ['14155552671'],
    value: 'Congratulations Ama, your MITA Academy admission is approved. Student ID: MITA/ICT-2026-0001. Temporary password: MITA/ICT-2026-0001. Sign in at https://academy.example.test/academy/login and change your password on first login.',
  });
});

test('requires a configured international template and surfaces provider failures', async () => {
  let requested = false;
  const international = await sendAdmissionSms({
    student: { firstName: 'Ama', phone: '+1 415 555 2671', studentId: 'MITA/ICT-2026-0001' },
    portalUrl: 'https://academy.example.test/academy/login',
    env: configuredEnvironment,
    fetchImpl: async () => { requested = true; },
  });
  assert.equal(international.ok, false);
  assert.match(international.error, /approved mNotify international template/);
  assert.equal(requested, false);

  const providerFailure = await sendAcademySms({
    phone: '+1 415 555 2671',
    message: 'Your class schedule changed.',
    env: { ...configuredEnvironment, ACADEMY_MNOTIFY_INTERNATIONAL_TEMPLATE_ID: 'template_123' },
    fetchImpl: async () => ({
      ok: false,
      status: 422,
      json: async () => ({ status: 'error', message: 'Template is not approved for this country.' }),
    }),
  });
  assert.deepEqual(providerFailure, {
    ok: false,
    error: 'Template is not approved for this country.',
  });
});

test('routes mNotify local-country exceptions through quick SMS', async () => {
  let capturedUrl;
  let capturedRequest;
  const result = await sendAcademySms({
    phone: '+221 77 123 45 67',
    message: 'Your class schedule changed.',
    env: configuredEnvironment,
    fetchImpl: async (url, request) => {
      capturedUrl = new URL(url);
      capturedRequest = JSON.parse(request.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'success', summary: { total_sent: 1 } }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(capturedUrl.pathname, '/api/sms/quick');
  assert.equal(capturedRequest.recipient[0], '221771234567');
});

test('requires mNotify to confirm at least one recipient was sent', async () => {
  const result = await sendAdmissionSms({
    student: { firstName: 'Ama', phone: '0241234567', studentId: 'MITA/ICT-2026-0001' },
    portalUrl: 'https://academy.example.test/academy/login',
    env: configuredEnvironment,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success', summary: { total_sent: 0 } }),
    }),
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /could not send the SMS/);
});

test('sends generic Academy SMS notifications through mNotify', async () => {
  let requestBody;
  const result = await sendAcademySms({
    phone: '+233 24 123 4567',
    message: 'Your class schedule changed.',
    env: configuredEnvironment,
    fetchImpl: async (_url, request) => {
      requestBody = JSON.parse(request.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'success', summary: { total_sent: 1 } }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(requestBody.recipient[0], '0241234567');
  assert.equal(requestBody.message, 'Your class schedule changed.');
});
