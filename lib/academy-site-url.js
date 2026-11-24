const DEFAULT_ACADEMY_SITE_URL = 'https://academy.menositconsult.com';
const ACADEMY_HOSTNAME = 'academy.menositconsult.com';

function getAcademySiteUrl(request) {
  const configuredUrl = process.env.ACADEMY_SITE_URL || process.env.NEXT_PUBLIC_ACADEMY_SITE_URL;
  if (configuredUrl) return new URL(configuredUrl).origin;
  if (process.env.NODE_ENV !== 'production' && request?.url) {
    return new URL(request.url).origin;
  }
  return DEFAULT_ACADEMY_SITE_URL;
}

function isAcademyHostname(hostname) {
  const configuredUrl = process.env.ACADEMY_SITE_URL || process.env.NEXT_PUBLIC_ACADEMY_SITE_URL;
  const academyHostname = configuredUrl ? new URL(configuredUrl).hostname : ACADEMY_HOSTNAME;
  let requestHostname = String(hostname || '').toLowerCase();
  try {
    requestHostname = new URL(`http://${requestHostname}`).hostname;
  } catch {
    return false;
  }
  return requestHostname === academyHostname.toLowerCase();
}

function shouldRewriteAcademyRoot(hostname, pathname) {
  return isAcademyHostname(hostname) && pathname === '/';
}

module.exports = {
  ACADEMY_HOSTNAME,
  DEFAULT_ACADEMY_SITE_URL,
  getAcademySiteUrl,
  isAcademyHostname,
  shouldRewriteAcademyRoot,
};
