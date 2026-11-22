const MIME_EXTENSIONS = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function normalizeMaterialLink(title, value) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const url = typeof value === 'string' ? value.trim() : '';
  if (!url || url.length > 2048) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !parsed.hostname) return null;
    const materialTitle = cleanTitle || parsed.hostname;
    if (materialTitle.length > 160) return null;
    return { title: materialTitle, kind: 'link', url: parsed.toString() };
  } catch {
    return null;
  }
}

function validateCourseMaterialFile(fileName, mime, buffer) {
  if (typeof fileName !== 'string' || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  const cleanName = fileName.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f]/g, '').trim();
  const mimeType = typeof mime === 'string' ? mime.split(';')[0].trim().toLowerCase() : '';
  const extension = MIME_EXTENSIONS[mimeType];
  if (!cleanName || cleanName.length > 180 || !extension ||
      cleanName.split('.').pop().toLowerCase() !== extension) return null;
  if (mimeType === 'application/pdf' && !buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) return null;
  if (mimeType === 'text/plain' && buffer.includes(0)) return null;
  if (extension !== 'pdf' && extension !== 'txt' &&
      !(buffer[0] === 0x50 && buffer[1] === 0x4b)) return null;
  return {
    fileName: cleanName,
    mime: mimeType,
    extension,
    size: buffer.length,
  };
}

function materialDownloadUrl(lessonId, materialId) {
  return `/api/academy/lessons/${encodeURIComponent(lessonId)}/materials/${encodeURIComponent(materialId)}`;
}

module.exports = {
  normalizeMaterialLink,
  validateCourseMaterialFile,
  materialDownloadUrl,
};
