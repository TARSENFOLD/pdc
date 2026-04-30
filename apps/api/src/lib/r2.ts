import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { env } from './env.js';
import type { ColdStorageEvent } from '@pdc/shared';

const log = pino({ name: 'r2-client' });

const FALLBACK_DIR = '/tmp/pdc-cold-storage';

function buildS3Client(): S3Client | null {
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    log.warn('R2 não configurado — cold storage usará fallback local');
    return null;
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}

let s3: S3Client | null = null;

function getClient(): S3Client | null {
  if (!s3) s3 = buildS3Client();
  return s3;
}

function buildKey(): string {
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const h = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `cold-storage/${y}/${m}/${d}/${h}-${min}-${s}-${randomUUID()}.ndjson`;
}

function toNdjson(events: ColdStorageEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join('\n');
}

function writeFallback(key: string, ndjson: string): void {
  try {
    fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    const filename = path.join(FALLBACK_DIR, key.replaceAll('/', '-'));
    fs.writeFileSync(filename, ndjson, 'utf-8');
    log.error({ filename }, 'R2 indisponível — batch escrito em disco (fallback)');
  } catch (err) {
    log.error({ err }, 'Fallback de cold storage falhou — eventos perdidos');
  }
}

export async function uploadColdBatch(events: ColdStorageEvent[]): Promise<void> {
  if (events.length === 0) return;

  const key = buildKey();
  const ndjson = toNdjson(events);
  const client = getClient();

  if (!client) {
    writeFallback(key, ndjson);
    return;
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET,
        Key: key,
        Body: ndjson,
        ContentType: 'application/x-ndjson',
      }),
    );
    log.info({ key, count: events.length }, 'Cold batch enviado para R2');
  } catch (err) {
    log.error({ err, key }, 'Upload R2 falhou — activando fallback local');
    writeFallback(key, ndjson);
  }
}

export async function listColdEvents(prefix: string): Promise<string[]> {
  const client = getClient();
  if (!client) return [];

  try {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET,
        Prefix: prefix,
      }),
    );
    return (result.Contents ?? []).map((o) => o.Key ?? '').filter(Boolean);
  } catch (err) {
    log.error({ err, prefix }, 'Erro ao listar cold events de R2');
    return [];
  }
}
