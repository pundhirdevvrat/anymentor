/**
 * Storage Service - Local disk or AWS S3 based on USE_S3 env var
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const USE_S3 = process.env.USE_S3 === 'true';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// ─── Local Storage ────────────────────────────────────────────

const uploadLocal = (buffer, key, mimeType) => {
  const dir = path.join(UPLOAD_DIR, path.dirname(key));
  ensureDir(dir);
  const fullPath = path.join(UPLOAD_DIR, key);
  fs.writeFileSync(fullPath, buffer);
  return `/uploads/${key}`;
};

const deleteLocal = (key) => {
  const fullPath = path.join(UPLOAD_DIR, key.replace('/uploads/', ''));
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

// ─── S3 Storage ───────────────────────────────────────────────

const uploadS3 = async (buffer, key, mimeType) => {
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  await client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${process.env.AWS_S3_URL}/${key}`;
};

const deleteS3 = async (key) => {
  const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  await client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key }));
};

// ─── Unified API ─────────────────────────────────────────────

const upload = async (buffer, folder, filename, mimeType) => {
  const ext = mimeType.split('/')[1] || 'bin';
  const key = `${folder}/${filename || uuidv4()}.${ext}`;

  try {
    const url = USE_S3 ? await uploadS3(buffer, key, mimeType) : uploadLocal(buffer, key, mimeType);
    logger.info(`File uploaded: ${url}`);
    return url;
  } catch (err) {
    logger.error(`File upload failed: ${err.message}`);
    throw err;
  }
};

const remove = async (url) => {
  try {
    const key = url.replace('/uploads/', '').replace(`${process.env.AWS_S3_URL}/`, '');
    USE_S3 ? await deleteS3(key) : deleteLocal(key);
    logger.info(`File deleted: ${url}`);
  } catch (err) {
    logger.warn(`File delete failed: ${err.message}`);
  }
};

module.exports = { upload, remove };
