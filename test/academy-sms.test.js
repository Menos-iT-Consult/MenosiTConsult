const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getMnotifyConfigurationError,
  normalizeGhanaRecipient,
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

test('reports mNotify rejections and refuses international numbers', async () => {
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

  let requested = false;
  const international = await sendAdmissionSms({
    student: { firstName: 'Ama', phone: '+1 415 555 2671', studentId: 'MITA/ICT-2026-0001' },
    portalUrl: 'https://academy.example.test/academy/login',
    env: configuredEnvironment,
    fetchImpl: async () => { requested = true; },
  });
  assert.equal(international.ok, false);
  assert.match(international.error, /approved mNotify template/);
  assert.equal(requested, false);
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
