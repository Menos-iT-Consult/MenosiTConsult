export const MAX_IMAGE_MB = 16;

export async function apiFetch(path, options = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...options });
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.replace('/admin/login');
    const err = new Error('Unauthorised');
    err.auth = true;
    throw err;
  }
  return res;
}

export async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const data = await res.json();
    return data.loggedIn === true;
  } catch {
    return false;
  }
}

// Shared media uploader — presigned direct-to-R2 first (bytes go browser → R2,
// bypassing the ~4.5 MB serverless body cap), falling back to the inline
// server route when R2 is not configured.
export async function uploadMediaFile(file) {
  const mime = file.type || 'application/octet-stream';

  // 1) Presigned direct-to-R2
  try {
    const pre = await fetch(`/api/manage/upload/presign?mime=${encodeURIComponent(mime)}`, {
      credentials: 'same-origin',
    });
    if (pre.ok) {
      const { uploadUrl, key, mime: signedMime } = await pre.json();
      const put = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': signedMime || mime },
        body: file,
      });
      if (!put.ok) throw Object.assign(new Error(`R2 rejected the upload (HTTP ${put.status}).`), { fatal: true });
      const done = await fetch('/api/manage/upload/complete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, mime: signedMime || mime, size: file.size }),
      });
      if (!done.ok) {
        const e = await done.json().catch(() => ({}));
        throw Object.assign(new Error(e.error || 'Upload registration failed.'), { fatal: true });
      }
      return (await done.json()).url;
    }
    // Not ok → 501 (R2 not configured) or transient error → try inline below.
  } catch (err) {
    // Bytes already reached R2 → don't silently re-upload inline (would duplicate).
    if (err && err.fatal) throw err;
    // Presign step failed → fall through to inline.
  }

  // 2) Inline fallback (legacy / no-R2 mode)
  const res = await fetch('/api/manage/upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': mime },
    body: file,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || 'Image upload failed.');
  }
  return (await res.json()).url;
}

export const uploadImageFile = uploadMediaFile;
