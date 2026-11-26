const storage = require('../backend/academy-r2');
const {
  MAX_ACADEMY_FILE_SIZE,
  validateCourseMaterialFile,
} = require('./academy-content');

class AcademyFileUploadError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function finalizePrivateAcademyCourseFile(uploadKey, fileName, id) {
  if (!storage.isPrivateCourseMaterialUploadKey(uploadKey)) {
    throw new AcademyFileUploadError('Upload the file again before attaching it.', 400);
  }
  if (!storage.certificateStorageEnabled()) {
    throw new AcademyFileUploadError('Private Academy course-file storage is not configured.', 503);
  }

  let finalKey = '';
  try {
    let uploadInfo;
    try {
      uploadInfo = await storage.getPrivateCourseMaterialUploadInfo(uploadKey);
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw new AcademyFileUploadError('Uploaded file not found. Upload it again.', 400);
      }
      throw error;
    }
    if (!Number.isSafeInteger(uploadInfo.size) || uploadInfo.size < 1) {
      throw new AcademyFileUploadError('The uploaded file is empty or invalid.', 400);
    }
    if (uploadInfo.size > MAX_ACADEMY_FILE_SIZE) {
      throw new AcademyFileUploadError('Course files must be 10 MB or smaller.', 413);
    }
    const bytes = await storage.getPrivateCourseMaterialUpload(uploadKey);
    if (bytes.length !== uploadInfo.size || bytes.length > MAX_ACADEMY_FILE_SIZE) {
      throw new AcademyFileUploadError('Uploaded file size could not be verified.', 400);
    }
    const fileInfo = validateCourseMaterialFile(fileName, uploadInfo.mime, bytes);
    if (!fileInfo) {
      throw new AcademyFileUploadError(
        'Upload a valid PDF, TXT, DOCX, PPTX, XLSX, JPEG, PNG, or WebP file with a matching extension.',
        400
      );
    }
    const savedFile = await storage.putPrivateCourseMaterial(bytes, fileInfo.mime);
    finalKey = savedFile.key;
    await storage.deletePrivateCourseMaterialUpload(uploadKey);
    return {
      uploadedKey: finalKey,
      attachment: {
        id,
        fileName: fileInfo.fileName,
        storageKey: finalKey,
        contentType: fileInfo.mime,
        fileSize: savedFile.size,
      },
    };
  } catch (error) {
    for (const key of [finalKey, uploadKey]) {
      if (!key) continue;
      try {
        if (key === uploadKey) await storage.deletePrivateCourseMaterialUpload(key);
        else await storage.deletePrivateCourseMaterial(key);
      } catch (cleanupError) {
        console.error('Academy course-file staging cleanup error:', cleanupError);
      }
    }
    throw error;
  }
}

module.exports = {
  AcademyFileUploadError,
  finalizePrivateAcademyCourseFile,
};
