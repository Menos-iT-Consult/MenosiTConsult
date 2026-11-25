const DEFAULT_ACADEMY_SITE_SETTINGS = Object.freeze({
  email: 'academy@menositconsult.com',
  phone: '+233 54 912 8384',
  whatsapp: '233549128384',
  location: 'Agona, Western Region, Ghana',
  officeHours: 'Monday–Friday, 9:00am–5:00pm',
  facebook: '',
  instagram: 'https://instagram.com/menos_it_consult',
  linkedin: '',
  youtube: '',
  tiktok: '',
});

const SOCIAL_FIELDS = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeAcademySiteSettings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(
    Object.keys(DEFAULT_ACADEMY_SITE_SETTINGS).map((field) => [
      field,
      typeof source[field] === 'string'
        ? source[field].trim()
        : DEFAULT_ACADEMY_SITE_SETTINGS[field],
    ])
  );
}

function validateAcademySiteSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: 'Site settings are required.' };
  }
  for (const field of Object.keys(DEFAULT_ACADEMY_SITE_SETTINGS)) {
    if (value[field] !== undefined && typeof value[field] !== 'string') {
      return { error: `Enter a text value for ${field}.` };
    }
  }

  const settings = normalizeAcademySiteSettings(value);
  if (!settings.email || settings.email.length > 254 || !EMAIL_PATTERN.test(settings.email)) {
    return { error: 'Enter a valid Academy contact email.' };
  }
  if (settings.phone.length > 40 || !/^[+\d().\s-]*$/.test(settings.phone)) {
    return { error: 'Enter a valid contact phone number.' };
  }
  if (settings.whatsapp && !/^\d{7,15}$/.test(settings.whatsapp)) {
    return { error: 'WhatsApp must contain digits only, including the country code.' };
  }
  if (settings.location.length > 200) {
    return { error: 'Location must be 200 characters or fewer.' };
  }
  if (settings.officeHours.length > 120) {
    return { error: 'Office hours must be 120 characters or fewer.' };
  }

  for (const field of SOCIAL_FIELDS) {
    const socialUrl = settings[field];
    if (!socialUrl) continue;
    try {
      if (new URL(socialUrl).protocol !== 'https:') throw new Error('Unsupported protocol.');
    } catch {
      return { error: `Enter a valid HTTPS URL for ${field}.` };
    }
  }

  return { settings };
}

module.exports = {
  DEFAULT_ACADEMY_SITE_SETTINGS,
  normalizeAcademySiteSettings,
  validateAcademySiteSettings,
};
