import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../lib/env.js';

const R2_ACCOUNT_ID = env.R2_ACCOUNT_ID ?? '';
const R2_ACCESS_KEY_ID = env.R2_ACCESS_KEY_ID ?? '';
const R2_SECRET_ACCESS_KEY = env.R2_SECRET_ACCESS_KEY ?? '';
const R2_BUCKET = env.R2_BUCKET;
const R2_PUBLIC_URL = env.R2_PUBLIC_URL ?? '';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
}

export function getPublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}
