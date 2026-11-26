function attachmentName(value) {
  const clean = String(value || 'course-material')
    .replace(/[\u0000-\u001f\u007f"\\]/g, '_')
    .slice(0, 180);
  return `attachment; filename="course-material"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

async function privateAcademyCourseFileResponse(attachment, storage) {
  const bytes = await storage.getPrivateCourseMaterial(attachment.storageKey);
  return new Response(bytes, {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': attachmentName(attachment.fileName),
      'Content-Length': String(bytes.length),
      'Content-Type': attachment.contentType,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

module.exports = { privateAcademyCourseFileResponse };
