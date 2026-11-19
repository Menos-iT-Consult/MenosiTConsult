function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function stripPadding(value) {
  return value.replace(/=+$/, '');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifySignedCookie(raw, secret) {
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* keep raw — already decoded or not percent-encoded */
  }

  if (!secret) return value === 'true';

  const rest = value.startsWith('s:') ? value.slice(2) : value;
  const dot = rest.lastIndexOf('.');
  if (dot <= 0) return false;
  const payload = rest.slice(0, dot);
  const signature = stripPadding(rest.slice(dot + 1));
  if (!payload || !signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = stripPadding(toBase64(mac));
  return timingSafeEqual(expected, signature);
}

module.exports = { verifySignedCookie };
