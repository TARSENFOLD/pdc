import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  MediaEntityTypeSchema,
  PresignedRequestSchema,
  UploadResultSchema,
  type MediaEntityType,
} from '@pdc/shared';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { rateLimitMediaUpload } from '../middleware/rateLimit.js';
import {
  generatePresignedUrl,
  getPublicUrl,
  isR2Ready,
  MediaStorageError,
  readLocalUpload,
  uploadToR2,
} from '../modules/media/r2.service.js';
import { ALLOWED_MEDIA_MIME_TYPES, validateMagicBytes } from '../modules/media/file-type-guard.js';
import { formatBytes, getMediaSizeLimit } from '../modules/media/limits.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import { applyCorsHeaders } from '../lib/cors.js';
import crypto from 'node:crypto';
import path from 'node:path';
import pino from 'pino';

type Vars = { Variables: AuthVariables };
const log = pino({ name: 'routes:media' });

export const mediaRoutes = new Hono<Vars>();

mediaRoutes.use('*', verifyJwt);

// POST /media/presigned — Obtem URL para upload direto via Browser.
// NOTA: este endpoint não valida magic bytes (browser PUT direto). Usar `/upload`
// para conteúdo controlado pela plataforma. Pre-signed permanece para uso futuro
// com validação assíncrona.
mediaRoutes.post('/presigned', rateLimitMediaUpload, zValidator('json', PresignedRequestSchema), async (c) => {
  const { filename, mimeType, sizeBytes, entityType } = c.req.valid('json');
  const user = c.get('user');
  const sizeLimit = getMediaSizeLimit(entityType);

  if (!ALLOWED_MEDIA_MIME_TYPES.has(mimeType)) {
    return c.json({ error: 'Tipo de ficheiro não permitido pelo ecossistema.', code: 'TYPE_NOT_ALLOWED' }, 415);
  }

  if (sizeBytes > sizeLimit) {
    log.warn(
      { metric: 'upload_rejection_count', reason: 'size_limit', entityType, sizeBytes, sizeLimit },
      'Upload rejeitado por limite de tamanho',
    );
    return c.json({
      error: `Ficheiro excede o limite de ${formatBytes(sizeLimit)} para ${entityType}.`,
      code: 'SIZE_LIMIT_EXCEEDED',
    }, 413);
  }

  // Prevenção de colisões com random UUID e sanitização
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const mediaId = crypto.randomUUID();
  const key = `uploads/${user.id}/${mediaId}-${safeName}`;

  try {
    if (!await isR2Ready()) {
      throw new MediaStorageError('MEDIA_STORAGE_UNAVAILABLE', new Error('R2 readiness probe failed'));
    }
    const uploadUrl = await generatePresignedUrl(key, mimeType);
    const publicUrl = getPublicUrl(key);

    return c.json(
      {
        uploadUrl,
        publicUrl,
        mediaId,
        key,
        mimeType,
        sizeBytes,
      },
      201
    );
  } catch (err) {
    log.error({ err, userId: user.id, mediaId }, 'Falha ao gerar upload presigned');
    applyCorsHeaders(c);
    if (err instanceof MediaStorageError) {
      c.header('Retry-After', '60');
      return c.json({ error: err.message, code: err.code }, 503);
    }
    return c.json({ error: 'Falha ao preparar upload.', code: 'MEDIA_UPLOAD_FAILED' }, 502);
  }
});

// POST /media/upload — Upload direto via FormData (usado pelo frontend ProfilePhotoUpload)
mediaRoutes.post('/upload', rateLimitMediaUpload, async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.parseBody();
    const file = body['file'];
    const entityType = parseEntityType(body['entityType']);

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'Ficheiro não fornecido.' }, 400);
    }

    if (!entityType) {
      return c.json({ error: 'entityType inválido.', code: 'INVALID_ENTITY_TYPE' }, 400);
    }

    if (!ALLOWED_MEDIA_MIME_TYPES.has(file.type)) {
      return c.json({ error: 'Tipo de ficheiro não permitido pelo ecossistema.', code: 'TYPE_NOT_ALLOWED' }, 415);
    }

    const sizeLimit = getMediaSizeLimit(entityType);
    if (file.size > sizeLimit) {
      log.warn(
        { metric: 'upload_rejection_count', reason: 'size_limit', entityType, sizeBytes: file.size, sizeLimit },
        'Upload rejeitado por limite de tamanho',
      );
      return c.json({
        error: `Ficheiro excede o limite de ${formatBytes(sizeLimit)} para ${entityType}.`,
        code: 'SIZE_LIMIT_EXCEEDED',
      }, 413);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const mediaId = crypto.randomUUID();
    const key = `uploads/${user.id}/${mediaId}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const magicBytes = await validateMagicBytes(buffer, file.type);

    if (!magicBytes.ok) {
      return c.json({ error: magicBytes.reason, code: magicBytes.code }, 415);
    }

    await uploadToR2(key, buffer, file.type);

    const publicUrl = getPublicUrl(key);

    await eventBus.publishWithOutbox(DomainEventName.MEDIA_UPLOADED, {
      mediaId,
      uploaderId: user.id,
      url: publicUrl,
    }).catch((err: unknown) => {
      log.warn({ err, mediaId, uploaderId: user.id }, 'Falha ao publicar MEDIA_UPLOADED; upload preservado');
    });

    const uploadResult = UploadResultSchema.parse({
      id: mediaId,
      url: publicUrl,
      key,
      filename: safeName,
      mimeType: file.type,
      size: file.size,
    });

    return c.json(uploadResult, 201);
  } catch (err) {
    log.error({ err, userId: user.id }, 'Falha no upload de media');
    applyCorsHeaders(c);
    if (err instanceof MediaStorageError) {
      c.header('Retry-After', '60');
      return c.json({ error: err.message, code: err.code }, 503);
    }
    return c.json({ error: 'Falha ao processar upload.', code: 'MEDIA_UPLOAD_FAILED' }, 502);
  }
});

// POST /media/confirm — Informa o ecossistema G15 que o upload terminou
mediaRoutes.post('/confirm', zValidator('json', z.object({
  mediaId: z.string(),
  key: z.string(),
  publicUrl: z.string().url(),
})), async (c) => {
  const { mediaId, publicUrl } = c.req.valid('json');
  const user = c.get('user');

  // G15: O Ecossistema reconhece a nova mídia (ex: para processamento ML, moderação)
  await eventBus.publishWithOutbox(DomainEventName.MEDIA_UPLOADED, {
    mediaId,
    uploaderId: user.id,
    url: publicUrl,
  });

  return c.json({ success: true, url: publicUrl });
});

// Unauthenticated router — only serves local files in development (no R2 credentials)
export const mediaPublicRoutes = new Hono();

const LOCAL_MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', gif: 'image/gif', pdf: 'application/pdf', mp4: 'video/mp4',
};

mediaPublicRoutes.get('/local/*', (c): Response => {
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Not available in production.' }, 403);
  }
  const key = c.req.param('*') || c.req.path.split('/local/')[1] || '';
  if (!key) {
    return c.json({ error: 'Chave inválida.' }, 400);
  }
  if (Array.from(key).some(ch => ch.charCodeAt(0) < 32)) {
    return c.json({ error: 'Chave inválida.' }, 400);
  }
  const normalizedKey = path.posix.normalize(key).replace(/^\/+/, '');
  if (normalizedKey === '.' || normalizedKey.startsWith('../') || path.isAbsolute(normalizedKey)) {
    return c.json({ error: 'Chave inválida.' }, 400);
  }
  const UPLOADS_BASE = path.resolve(process.cwd(), 'uploads');
  const resolvedPath = path.resolve(UPLOADS_BASE, normalizedKey);
  if (!resolvedPath.startsWith(UPLOADS_BASE + path.sep)) {
    return c.json({ error: 'Chave inválida.' }, 400);
  }
  const file = readLocalUpload(normalizedKey);
  if (!file) {
    return c.json({ error: 'Ficheiro não encontrado.' }, 404);
  }
  const ext = normalizedKey.split('.').pop()?.toLowerCase() ?? '';
  const contentType = LOCAL_MIME_MAP[ext] ?? 'application/octet-stream';
  return new Response(file, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' },
  });
});

function parseEntityType(value: unknown): MediaEntityType | null {
  if (value === undefined) {
    return 'generic';
  }
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = MediaEntityTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
