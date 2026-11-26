'use client';

async function readJson(response, fallback) {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || fallback);
  return result;
}

export async function cancelPrivateAcademyCourseFile(courseId, key) {
  const response = await fetch('/api/academy/instructor/course-files/presign', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ courseId, key }),
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'Could not clean up the temporary file upload.');
  }
}

export async function uploadPrivateAcademyCourseFile(file, courseId) {
  const response = await fetch('/api/academy/instructor/course-files/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ courseId, mime: file.type, size: file.size }),
  });
  const signed = await readJson(response, 'Could not prepare the private file upload.');
  if (typeof signed.key !== 'string' || typeof signed.uploadUrl !== 'string' ||
      typeof signed.mime !== 'string') {
    throw new Error('The private file upload could not be prepared.');
  }
  let uploaded = false;
  try {
    const uploadResponse = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': signed.mime },
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error(`Private file upload failed (${uploadResponse.status}).`);
    }
    uploaded = true;
    return signed.key;
  } catch (error) {
    if (!uploaded) {
      try {
        await cancelPrivateAcademyCourseFile(courseId, signed.key);
      } catch (cleanupError) {
        console.error('Academy staged file cleanup error:', cleanupError);
      }
    }
    throw error;
  }
}
