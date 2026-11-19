const MAX_PASSPORT_PHOTO_SIZE = 5 * 1024 * 1024;

const SIGNATURE_CHECKS = {
  'image/jpeg': (bytes) => bytes.length >= 3 &&
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': (bytes) => bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
    bytes[6] === 0x1a && bytes[7] === 0x0a,
  'image/webp': (bytes) => bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP',
};

function validatePassportPhoto(bytes, mimeType) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) {
    return 'A passport photo is required.';
  }
  if (bytes.length > MAX_PASSPORT_PHOTO_SIZE) {
    return 'The passport photo must be 5 MB or smaller.';
  }
  const checkSignature = SIGNATURE_CHECKS[mimeType];
  if (!checkSignature) {
    return 'The passport photo must be a JPEG, PNG, or WebP image.';
  }
  if (!checkSignature(bytes)) {
    return 'The passport photo file does not match its image type.';
  }
  return '';
}

module.exports = {
  MAX_PASSPORT_PHOTO_SIZE,
  validatePassportPhoto,
};
