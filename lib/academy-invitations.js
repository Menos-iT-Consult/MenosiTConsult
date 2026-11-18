const crypto = require('crypto');

const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function createInstructorInvitationToken(now = new Date()) {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(now.getTime() + INVITATION_LIFETIME_MS).toISOString(),
  };
}

function hashInstructorInvitationToken(token) {
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return null;
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isInstructorInvitationRedeemable(invitation, now = new Date()) {
  if (
    !invitation ||
    invitation.role !== 'instructor' ||
    invitation.status !== 'pending' ||
    invitation.consumedAt
  ) return false;
  const expiresAt = new Date(invitation.expiresAt).getTime();
  const currentTime = new Date(now).getTime();
  return Number.isFinite(expiresAt) && Number.isFinite(currentTime) && expiresAt > currentTime;
}

module.exports = {
  INVITATION_LIFETIME_MS,
  createInstructorInvitationToken,
  hashInstructorInvitationToken,
  isInstructorInvitationRedeemable,
};
