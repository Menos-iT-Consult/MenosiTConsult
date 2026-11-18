/**
 * Academy-only Cloudflare R2 media storage.
 *
 * Uses the account credentials shared with the main R2 integration, but only
 * targets ACADEMY_R2_BUCKET. It never falls back to R2_BUCKET.
 */
const crypto = require('crypto');

let client = null;

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function bucket() {
  return env('ACADEMY_R2_BUCKET');
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

function publicBase() {
  return env('ACADEMY_R2_PUBLIC_BASE').replace(/\/+$/, '');
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
  publicBase,
  putImage,
  getImageBytes,
  presignPut,
};
