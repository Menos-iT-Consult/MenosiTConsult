const MNOTIFY_QUICK_SMS_URL = 'https://api.mnotify.com/api/sms/quick';

function getMnotifyConfigurationError(env = process.env) {
  if (!String(env.ACADEMY_MNOTIFY_API_KEY || '').trim()) {
    return 'Academy mNotify is not configured. Set ACADEMY_MNOTIFY_API_KEY.';
  }
  const sender = String(env.ACADEMY_MNOTIFY_SENDER || '').trim();
  if (!sender || sender.length > 11) {
    return 'Set ACADEMY_MNOTIFY_SENDER to an approved sender ID of 1 to 11 characters.';
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

function buildAdmissionSms({ firstName, studentId, portalUrl }) {
  const name = String(firstName || 'Applicant').replace(/[\r\n]/g, ' ').trim();
  return `Congratulations ${name}, your MITA Academy admission is approved. Student ID: ${studentId}. Temporary password: ${studentId}. Sign in at ${portalUrl} and change your password on first login.`;
}

async function sendAdmissionSms({
  student,
  portalUrl,
  fetchImpl = fetch,
  env = process.env,
}) {
  const configurationError = getMnotifyConfigurationError(env);
  if (configurationError) return { ok: false, error: configurationError };

  const recipient = normalizeGhanaRecipient(student.phone);
  if (!recipient) {
    return {
      ok: false,
      error: 'mNotify quick SMS requires a valid Ghana number. International numbers need an approved mNotify template.',
    };
  }
  if (!student.studentId) {
    return { ok: false, error: 'The admitted student does not have a Student ID.' };
  }

  const url = new URL(MNOTIFY_QUICK_SMS_URL);
  url.searchParams.set('key', String(env.ACADEMY_MNOTIFY_API_KEY).trim());
  const response = await fetchImpl(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      recipient: [recipient],
      sender: String(env.ACADEMY_MNOTIFY_SENDER).trim(),
      message: buildAdmissionSms({
        firstName: student.firstName,
        studentId: student.studentId,
        portalUrl,
      }),
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

module.exports = {
  getMnotifyConfigurationError,
  normalizeGhanaRecipient,
  buildAdmissionSms,
  sendAdmissionSms,
};
