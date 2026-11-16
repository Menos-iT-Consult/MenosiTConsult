const crypto = require('crypto');

// Helpers copied 1:1 from backend/routes/manage.js so every manage route
// validates with identical rules.
const newId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;

function cleanStr(v) {
  return typeof v === 'string' ? v.trim() : '';
}
function clampRating(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : fallback;
}
function cleanOutcomes(v, fallback) {
  if (!Array.isArray(v)) return fallback;
  return v.map(cleanStr).filter(Boolean).slice(0, 8);
}
function cleanStatus(v, fallback) {
  if (v === 'draft' || v === 'published') return v;
  return fallback;
}
function cleanImage(v) {
  const s = cleanStr(v);
  if (!s) return '';
  return /^\/api\/images\//.test(s) || /^https:\/\//.test(s) ? s.slice(0, 500) : '';
}

module.exports = { newId, cleanStr, clampRating, cleanOutcomes, cleanStatus, cleanImage };
