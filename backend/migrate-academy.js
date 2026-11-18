require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const academy = require('./academy-db');

(async () => {
  try {
    await academy.ensureAcademyReady();
    console.log('Academy database initialization complete.');
    process.exit(0);
  } catch (err) {
    console.error('Academy database initialization failed:', err.message);
    console.error('Set ACADEMY_DATABASE_URL and verify the database is reachable.');
    process.exit(1);
  }
})();
