function databaseIdentity(connectionString) {
  try {
    const url = new URL(connectionString);
    const host = url.hostname.toLowerCase() || url.searchParams.get('host') || '';
    const port = url.port || '5432';
    const database = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    if (!database) return null;
    return `${host}:${port}/${database}`;
  } catch {
    return null;
  }
}

function getAcademyDatabaseConfigError(env = process.env) {
  const academyUrl = String(env.ACADEMY_DATABASE_URL || '').trim();
  if (!academyUrl) {
    return 'Academy database not configured. Set ACADEMY_DATABASE_URL to a separate PostgreSQL database.';
  }

  const mainUrl = String(env.POSTGRES_URL || env.DATABASE_URL || '').trim();
  if (
    mainUrl &&
    (academyUrl === mainUrl ||
      databaseIdentity(academyUrl) === databaseIdentity(mainUrl))
  ) {
    return 'ACADEMY_DATABASE_URL must point to a database separate from POSTGRES_URL or DATABASE_URL.';
  }

  return null;
}

module.exports = { getAcademyDatabaseConfigError };
