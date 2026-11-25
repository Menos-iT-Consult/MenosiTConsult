const ADMISSIONS_SETTING_KEY = 'admissions_open';

function isAdmissionsOpen(value) {
  return value !== false;
}

function validateAdmissionsStatus(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.admissionsOpen !== 'boolean') {
    return { error: 'Admissions status must be open or closed.' };
  }
  return { admissionsOpen: body.admissionsOpen };
}

module.exports = {
  ADMISSIONS_SETTING_KEY,
  isAdmissionsOpen,
  validateAdmissionsStatus,
};
