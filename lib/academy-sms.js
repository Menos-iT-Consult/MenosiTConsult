const { parsePhoneNumberFromString } = require('libphonenumber-js/max');

const MNOTIFY_QUICK_SMS_URL = 'https://api.mnotify.com/api/sms/quick';
const MNOTIFY_INTERNATIONAL_TEMPLATE_URL = 'https://api.mnotify.com/api/template/send';

function getMnotifyApiKeyError(env = process.env) {
  if (!String(env.ACADEMY_MNOTIFY_API_KEY || '').trim()) {
    return 'Academy mNotify is not configured. Set ACADEMY_MNOTIFY_API_KEY.';
  }
  return null;
}

function getMnotifyConfigurationError(env = process.env) {
  const apiKeyError = getMnotifyApiKeyError(env);
  if (apiKeyError) return apiKeyError;
  const sender = String(env.ACADEMY_MNOTIFY_SENDER || '').trim();
  if (!sender || sender.length > 11) {
    return 'Set ACADEMY_MNOTIFY_SENDER to an approved sender ID of 1 to 11 characters.';
  }
  return null;
}

function getMnotifyInternationalConfigurationError(env = process.env) {
  const apiKeyError = getMnotifyApiKeyError(env);
  if (apiKeyError) return apiKeyError;
  const templateId = String(env.ACADEMY_MNOTIFY_INTERNATIONAL_TEMPLATE_ID || '').trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(templateId)) {
    return 'Set ACADEMY_MNOTIFY_INTERNATIONAL_TEMPLATE_ID to an approved mNotify international template ID.';
  }
  return null;
}

function normalizeGhanaRecipient(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('00233')) digits = digits.slice(2);
  if (digits.startsWith('233')) {
    if (digits.length === 12) return `0${digits.slice(3)}`;
    if (digits.length === 13 && digits[3] === '0') return `0${digits.slice(4)}`;
    return null;
  }
  if (/^0\d{9}$/.test(digits)) return digits;
  if (/^\d{9}$/.test(digits)) return `0${digits}`;
  return null;
}

function normalizeInternationalRecipient(phone) {
  const parsed = parsePhoneNumberFromString(String(phone || '').trim());
  if (!parsed || !parsed.isValid() || parsed.countryCallingCode === '233') return null;
  return parsed.number.slice(1);
}

function normalizeAcademyPhone(phone) {
  const ghanaRecipient = normalizeGhanaRecipient(phone);
  if (ghanaRecipient) return ghanaRecipient;

  const internationalRecipient = normalizeInternationalRecipient(phone);
  return internationalRecipient ? `+${internationalRecipient}` : null;
}

function normalizeQuickRecipient(phone) {
  const ghanaRecipient = normalizeGhanaRecipient(phone);
  if (ghanaRecipient) return ghanaRecipient;

  const internationalRecipient = normalizeInternationalRecipient(phone);
  if (/^(221|225)\d+$/.test(internationalRecipient || '')) return internationalRecipient;
  return null;
}

function buildAdmissionSms({ firstName, studentId, portalUrl }) {
  const name = String(firstName || 'Applicant').replace(/[\r\n]/g, ' ').trim();
  return `Congratulations ${name}, your MITA Academy admission is approved. Student ID: ${studentId}. Temporary password: ${studentId}. Sign in at ${portalUrl} and change your password on first login.`;
}

async function sendAcademySms({
  phone,
  message,
  fetchImpl = fetch,
  env = process.env,
}) {
  const quickRecipient = normalizeQuickRecipient(phone);
  const internationalRecipient = quickRecipient ? null : normalizeInternationalRecipient(phone);
  if (!quickRecipient && !internationalRecipient) {
    return {
      ok: false,
      error: 'Enter a valid Ghana number or an international phone number in E.164 format.',
    };
  }

  const configurationError = internationalRecipient
    ? getMnotifyInternationalConfigurationError(env)
    : getMnotifyConfigurationError(env);
  if (configurationError) return { ok: false, error: configurationError };

  const text = typeof message === 'string' ? message.trim() : '';
  if (!text || text.length > 1500) {
    return { ok: false, error: 'The Academy SMS message must contain 1 to 1,500 characters.' };
  }

  const isInternational = !!internationalRecipient;
  const templateId = isInternational
    ? String(env.ACADEMY_MNOTIFY_INTERNATIONAL_TEMPLATE_ID).trim()
    : '';
  const recipient = internationalRecipient || quickRecipient;
  const url = new URL(isInternational
    ? `${MNOTIFY_INTERNATIONAL_TEMPLATE_URL}/${encodeURIComponent(templateId)}`
    : MNOTIFY_QUICK_SMS_URL);
  url.searchParams.set('key', String(env.ACADEMY_MNOTIFY_API_KEY).trim());
  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(isInternational
      ? { recipient: [recipient], value: text }
      : {
        recipient: [recipient],
        sender: String(env.ACADEMY_MNOTIFY_SENDER).trim(),
        message: text,
        is_schedule: false,
        schedule_date: '',
      }),
    signal: AbortSignal.timeout(15000),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    return { ok: false, error: `mNotify returned an invalid response (HTTP ${response.status}).` };
  }

  const totalSent = Number(result?.summary?.total_sent);
  if (!response.ok || result?.status !== 'success' || !Number.isFinite(totalSent) || totalSent < 1) {
    const detail = typeof result?.message === 'string' ? result.message.slice(0, 200) : '';
    return {
      ok: false,
      error: detail || `mNotify could not send the SMS (HTTP ${response.status}).`,
    };
  }

  return {
    ok: true,
    campaignId: result.summary._id || null,
  };
}

async function sendAdmissionSms({
  student,
  portalUrl,
  fetchImpl = fetch,
  env = process.env,
}) {
  if (!student.studentId) {
    return { ok: false, error: 'The admitted student does not have a Student ID.' };
  }
  return sendAcademySms({
    phone: student.phone,
    message: buildAdmissionSms({
      firstName: student.firstName,
      studentId: student.studentId,
      portalUrl,
    }),
    fetchImpl,
    env,
  });
}

module.exports = {
  getMnotifyConfigurationError,
  normalizeGhanaRecipient,
  normalizeInternationalRecipient,
  normalizeAcademyPhone,
  normalizeQuickRecipient,
  buildAdmissionSms,
  sendAcademySms,
  sendAdmissionSms,
};
