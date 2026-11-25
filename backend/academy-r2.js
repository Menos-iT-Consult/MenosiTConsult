/**
 * Academy-only Cloudflare R2 media storage.
 *
 * Uses the account credentials shared with the main R2 integration, but only
 * targets ACADEMY_R2_BUCKET. It never falls back to R2_BUCKET.
 */
const crypto = require('crypto');

let client = null;
let certificateClient = null;

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function bucket() {
  return env('ACADEMY_R2_BUCKET');
}

function certificateBucket() {
  return env('ACADEMY_CERTIFICATE_R2_BUCKET');
}

function academyR2Enabled() {
  const academyBucket = bucket();
  const mainBucket = env('R2_BUCKET');
  return !!(
    env('R2_ACCESS_KEY_ID') &&
    env('R2_SECRET_ACCESS_KEY') &&
    academyBucket &&
    (!mainBucket || academyBucket.toLowerCase() !== mainBucket.toLowerCase())
  );
}

function academyCertificateStorageEnabled() {
  const certificateBucketName = certificateBucket();
  const publicBuckets = [env('ACADEMY_R2_BUCKET'), env('R2_BUCKET')].filter(Boolean);
  return !!(
    env('R2_ACCESS_KEY_ID') &&
    env('R2_SECRET_ACCESS_KEY') &&
    certificateBucketName &&
    !publicBuckets.some((name) => name.toLowerCase() === certificateBucketName.toLowerCase())
  );
}

function publicBase() {
  return env('ACADEMY_R2_PUBLIC_BASE').replace(/\/+$/, '');
}

function getAcademyMediaKey(value) {
  const isMediaKey = (key) =>
    typeof key === 'string' &&
    /^academy\/media\/\d{4}\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif|avif)$/i.test(key);
  if (isMediaKey(value)) return value;
  if (typeof value !== 'string') return '';

  const base = publicBase();
  try {
    if (value.startsWith('/')) {
      const relativePath = new URL(value, 'https://academy-media.invalid').pathname;
      const key = decodeURIComponent(relativePath).replace(/^\/+/, '');
      return isMediaKey(key) ? key : '';
    }

    const valueUrl = new URL(value);
    if (base) {
      const baseUrl = new URL(base);
      const basePath = baseUrl.pathname.replace(/\/+$/, '');
      const pathPrefix = basePath ? `${basePath}/` : '/';
      if (valueUrl.origin === baseUrl.origin && valueUrl.pathname.startsWith(pathPrefix)) {
        const key = decodeURIComponent(valueUrl.pathname.slice(pathPrefix.length));
        if (isMediaKey(key)) return key;
      }
    }

    if (valueUrl.protocol !== 'https:') return '';
    // Older media URLs can use a CDN host that is no longer configured.
    const path = decodeURIComponent(valueUrl.pathname);
    const match = path.match(/(?:^|\/)(academy\/media\/\d{4}\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif|avif))$/i);
    return match && isMediaKey(match[1]) ? match[1] : '';
  } catch {
    return '';
  }
}

function getAcademyMediaMime(key) {
  if (typeof key !== 'string' || !/^academy\/media\/\d{4}\//.test(key)) return '';
  const extension = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
  return {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    avif: 'image/avif',
  }[extension] || '';
}

function getClient() {
  const academyBucket = bucket();
  if (!env('R2_ACCESS_KEY_ID') || !env('R2_SECRET_ACCESS_KEY') || !academyBucket) {
    const error = new Error(
      'Academy R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and ACADEMY_R2_BUCKET.'
    );
    error.noR2 = true;
    throw error;
  }
  const mainBucket = env('R2_BUCKET');
  if (mainBucket && academyBucket.toLowerCase() === mainBucket.toLowerCase()) {
    const error = new Error('ACADEMY_R2_BUCKET must be different from R2_BUCKET.');
    error.noR2 = true;
    throw error;
  }
  if (!client) {
    const { S3Client } = require('@aws-sdk/client-s3');
    const endpoint = env('R2_ENDPOINT') ||
      (env('R2_ACCOUNT_ID') ? `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com` : '');
    client = new S3Client({
      region: 'auto',
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return client;
}

function getCertificateClient() {
  const bucketName = certificateBucket();
  if (!env('R2_ACCESS_KEY_ID') || !env('R2_SECRET_ACCESS_KEY') || !bucketName) {
    const error = new Error(
      'Private Academy certificate storage is not configured. Set R2 credentials and ACADEMY_CERTIFICATE_R2_BUCKET.'
    );
    error.noR2 = true;
    throw error;
  }
  const publicBuckets = [env('ACADEMY_R2_BUCKET'), env('R2_BUCKET')].filter(Boolean);
  if (publicBuckets.some((name) => name.toLowerCase() === bucketName.toLowerCase())) {
    const error = new Error(
      'ACADEMY_CERTIFICATE_R2_BUCKET must be separate from public Academy and main-site media buckets.'
    );
    error.noR2 = true;
    throw error;
  }
  if (!certificateClient) {
    const { S3Client } = require('@aws-sdk/client-s3');
    const endpoint = env('R2_ENDPOINT') ||
      (env('R2_ACCOUNT_ID') ? `https://${env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com` : '');
    certificateClient = new S3Client({
      region: 'auto',
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
      },
    });
  }
  return certificateClient;
}

function createPrivatePdfKey(category) {
  if (!['templates', 'issued'].includes(category)) {
    throw new Error('Unsupported private Academy PDF category.');
  }
  return `academy/private/certificates/${category}/${new Date().getFullYear()}/${crypto.randomBytes(20).toString('hex')}.pdf`;
}

async function putPrivatePdf(buffer, category) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A non-empty PDF buffer is required.');
  }
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = createPrivatePdfKey(category);
  await getCertificateClient().send(new PutObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
    CacheControl: 'private, no-store',
  }));
  return { key, size: buffer.length };
}

async function getPrivatePdfBytes(key) {
  if (typeof key !== 'string' ||
      !/^academy\/private\/certificates\/(templates|issued)\/\d{4}\/[a-f0-9]{40}\.pdf$/.test(key)) {
    throw new Error('Invalid private Academy PDF key.');
  }
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const result = await getCertificateClient().send(new GetObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
  }));
  return Buffer.from(await result.transformToByteArray());
}

async function deletePrivatePdf(key) {
  if (typeof key !== 'string' ||
      !/^academy\/private\/certificates\/(templates|issued)\/\d{4}\/[a-f0-9]{40}\.pdf$/.test(key)) {
    throw new Error('Invalid private Academy PDF key.');
  }
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await getCertificateClient().send(new DeleteObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
  }));
}

const PRIVATE_PHOTO_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isPrivatePhotoKey(key) {
  return typeof key === 'string' &&
    /^academy\/private\/student-photos\/\d{4}\/[a-f0-9]{40}\.(jpg|jpeg|png|webp)$/.test(key);
}

function getPrivatePhotoKey(value) {
  if (isPrivatePhotoKey(value)) return value;
  if (typeof value !== 'string') return '';
  try {
    const url = value.startsWith('/')
      ? new URL(value, 'https://academy-photo.invalid')
      : new URL(value);
    if (!value.startsWith('/') && url.protocol !== 'https:') return '';
    const path = decodeURIComponent(url.pathname);
    const match = path.match(/(?:^|\/)(academy\/private\/student-photos\/\d{4}\/[a-f0-9]{40}\.(?:jpg|jpeg|png|webp))$/i);
    return match && isPrivatePhotoKey(match[1]) ? match[1] : '';
  } catch {
    return '';
  }
}

async function putPrivatePhoto(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A non-empty passport photo buffer is required.');
  }
  const extension = PRIVATE_PHOTO_TYPES[mime];
  if (!extension) {
    throw new Error('Unsupported private Academy passport photo type.');
  }
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = `academy/private/student-photos/${new Date().getFullYear()}/${crypto.randomBytes(20).toString('hex')}.${extension}`;
  await getCertificateClient().send(new PutObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: 'private, no-store',
  }));
  return { key, size: buffer.length };
}

async function getPrivatePhoto(key) {
  if (!isPrivatePhotoKey(key)) {
    throw new Error('Invalid private Academy passport photo key.');
  }
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const result = await getCertificateClient().send(new GetObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
  }));
  const extension = key.slice(key.lastIndexOf('.') + 1);
  const mime = extension === 'jpeg'
    ? 'image/jpeg'
    : Object.keys(PRIVATE_PHOTO_TYPES).find((type) => PRIVATE_PHOTO_TYPES[type] === extension);
  return { bytes: Buffer.from(await result.transformToByteArray()), mime };
}

async function deletePrivatePhoto(key) {
  if (!isPrivatePhotoKey(key)) {
    throw new Error('Invalid private Academy passport photo key.');
  }
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await getCertificateClient().send(new DeleteObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
  }));
}

const PRIVATE_COURSE_MATERIAL_TYPES = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

function isPrivateCourseMaterialKey(key) {
  return typeof key === 'string' &&
    /^academy\/private\/course-content\/\d{4}\/[a-f0-9]{40}\.(pdf|txt|docx|pptx|xlsx)$/.test(key);
}

async function putPrivateCourseMaterial(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('A non-empty course material buffer is required.');
  }
  const extension = PRIVATE_COURSE_MATERIAL_TYPES[mime];
  if (!extension) throw new Error('Unsupported private Academy course material type.');
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = `academy/private/course-content/${new Date().getFullYear()}/${crypto.randomBytes(20).toString('hex')}.${extension}`;
  await getCertificateClient().send(new PutObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: 'private, no-store',
  }));
  return { key, size: buffer.length };
}

async function getPrivateCourseMaterial(key) {
  if (!isPrivateCourseMaterialKey(key)) throw new Error('Invalid private Academy course material key.');
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const result = await getCertificateClient().send(new GetObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
  }));
  return Buffer.from(await result.transformToByteArray());
}

async function deletePrivateCourseMaterial(key) {
  if (!isPrivateCourseMaterialKey(key)) throw new Error('Invalid private Academy course material key.');
  const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
  await getCertificateClient().send(new DeleteObjectCommand({
    Bucket: certificateBucket(),
    Key: key,
  }));
}

const EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

function createKey(mime) {
  const extension = EXT[mime] || 'bin';
  const id = 'img-' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
  return `academy/media/${new Date().getFullYear()}/${id}.${extension}`;
}

async function putImage(buffer, mime) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = createKey(mime);
  await getClient().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
  const base = publicBase();
  return {
    key,
    mime,
    size: buffer.length,
    publicUrl: base ? `${base}/${key}` : null,
  };
}

async function getImageBytes(key) {
  const { GetObjectCommand } = require('@aws-sdk/client-s3');
  const result = await getClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  return Buffer.from(await result.transformToByteArray());
}

async function presignPut(mime) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
  const key = createKey(mime);
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: mime,
    CacheControl: 'public, max-age=31536000, immutable',
  });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 600 });
  const base = publicBase();
  return {
    id: key.match(/img-[a-z0-9]+/)[0],
    key,
    mime,
    uploadUrl,
    publicUrl: base ? `${base}/${key}` : null,
  };
}

module.exports = {
  r2Enabled: academyR2Enabled,
  certificateStorageEnabled: academyCertificateStorageEnabled,
  publicBase,
  getAcademyMediaKey,
  getAcademyMediaMime,
  putImage,
  getImageBytes,
  presignPut,
  putPrivatePdf,
  getPrivatePdfBytes,
  deletePrivatePdf,
  isPrivatePhotoKey,
  getPrivatePhotoKey,
  putPrivatePhoto,
  getPrivatePhoto,
  deletePrivatePhoto,
  isPrivateCourseMaterialKey,
  putPrivateCourseMaterial,
  getPrivateCourseMaterial,
  deletePrivateCourseMaterial,
};
