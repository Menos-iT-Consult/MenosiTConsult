const bcrypt = require('bcryptjs');

async function verifyAcademyPassword(password, passwordHash) {
  if (typeof passwordHash !== 'string' || !passwordHash) return false;
  return bcrypt.compare(String(password), passwordHash);
}

module.exports = { verifyAcademyPassword };
