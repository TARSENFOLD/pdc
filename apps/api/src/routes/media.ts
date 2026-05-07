import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { generatePresignedUrl, getPublicUrl, uploadToR2, readLocalUpload } from '../modules/media/r2.service.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import crypto from 'node:crypto';
import path from 'node:path';

type Vars = { Variables: AuthVariables };

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
]);

export const mediaRoutes = new Hono<Vars>();

mediaRoutes.use('*', verifyJwt);

const PresignedRequestSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().max(10 * 1024 * 1024), // 10MB máximo E2E
});

// POST /media/presigned — Obtem URL para upload direto via Browser
mediaRoutes.post('/presigned', zValidator('json', PresignedRequestSchema), async (c) => {
  const { filename, mimeType, sizeBytes } = c.req.valid('json');
  const user = c.get('user');

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return c.json({ error: 'Tipo de ficheiro não permitido pelo ecossistema.' }, 415);
  }

  // Prevenção de colisões com random UUID e sanitização
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const mediaId = crypto.randomUUID();
  const key = `uploads/${user.id}/${mediaId}-${safeName}`;

  try {
    const uploadUrl = await generatePresignedUrl(key, mimeType);
    const publicUrl = getPublicUrl(key);

    return c.json(
      {
        uploadUrl,
        publicUrl,
        mediaId,
        key,
        mimeType,
        sizeBytes
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});

// POST /media/upload — Upload direto via FormData (usado pelo frontend ProfilePhotoUpload)
mediaRoutes.post('/upload', async (c) => {
  const user = c.get('user');

  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'Ficheiro não fornecido.' }, 400);
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return c.json({ error: 'Tipo de ficheiro não permitido pelo ecossistema.' }, 415);
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return c.json({ error: 'Ficheiro excede o limite de 10MB.' }, 413);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const mediaId = crypto.randomUUID();
    const key = `uploads/${user.id}/${mediaId}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadToR2(key, buffer, file.type);

    const publicUrl = getPublicUrl(key);

    await eventBus.publishWithOutbox(DomainEventName.MEDIA_UPLOADED, {
      mediaId,
      uploaderId: user.id,
      url: publicUrl,
    });

    return c.json({
      id: mediaId,
      url: publicUrl,
      key,
      filename: safeName,
      mimeType: file.type,
      size: file.size,
    }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
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
  const key = c.req.param('*');
  if (!key) {
    return c.json({ error: 'Chave inválida.' }, 400);
  }
  if (Array.from(key).some(ch => ch.charCodeAt(0) < 32)) {
    return c.json({ error: 'Chave inválida.' }, 400);
  }
  const normalizedKey = path.posix.normalize(key).replace(/^\/+/, '');
  if (normalizedKey === '.' || normalizedKey.startsWith('../') || path.isAbsolute(key)) {
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
