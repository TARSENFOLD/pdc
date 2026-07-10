import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../../lib/env.js';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

const log = pino({ name: 'r2-service' });

const LOCAL_UPLOAD_DIR = '/tmp/pdc-uploads';

export function isR2Configured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

function resolveLocalUploadPath(key: string): string {
  const baseDir = path.resolve(LOCAL_UPLOAD_DIR);
  const localPath = path.resolve(baseDir, key);
  if (localPath !== baseDir && !localPath.startsWith(`${baseDir}${path.sep}`)) {
    throw new Error('Invalid media key: path traversal detected');
  }
  return localPath;
}

let _s3: S3Client | undefined;

function getS3(): S3Client {
  if (!_s3) {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY no .env');
    }
    _s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _s3;
}

export async function generatePresignedUrl(
  key: string,
  mimeType: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
    ContentType: mimeType,
  });
  return getSignedUrl(getS3(), command, { expiresIn: expiresInSeconds });
}

export async function generatePresignedReadUrl(
  key: string,
  expiresInSeconds = 900
): Promise<string> {
  if (!isR2Configured()) {
    return getPublicUrl(key);
  }
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(getS3(), command, { expiresIn: expiresInSeconds });
}

export async function uploadToR2(key: string, buffer: Buffer, mimeType: string): Promise<void> {
  if (!isR2Configured()) {
    const localPath = resolveLocalUploadPath(key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);
    log.warn({ key }, 'R2 não configurado — ficheiro salvo em /tmp/pdc-uploads');
    return;
  }
  await getS3().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
}

export function getPublicUrl(key: string): string {
  if (!isR2Configured()) {
    // env.API_URL is absolute (e.g. http://localhost:3001) — required by z.string().url() in UpdatePerfilPayloadSchema
    return `${env.API_URL}/media/local/${key}`;
  }
  if (!env.R2_PUBLIC_URL) {
    throw new Error('R2_PUBLIC_URL must be set when R2 is configured');
  }
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export function readLocalUpload(key: string): Buffer | null {
  let localPath: string;
  try {
    localPath = resolveLocalUploadPath(key);
  } catch {
    return null;
  }
  try {
    return fs.readFileSync(localPath);
  } catch {
    return null;
  }
}
