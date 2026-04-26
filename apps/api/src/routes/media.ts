import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { generatePresignedUrl, getPublicUrl } from '../modules/media/r2.service.js';
import { eventBus } from '../modules/events/event-bus.js';
import { DomainEventName } from '../modules/events/types.js';
import crypto from 'node:crypto';

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

// POST /media/confirm — Informa o ecossistema G15 que o upload terminou
mediaRoutes.post('/confirm', zValidator('json', z.object({
  mediaId: z.string(),
  key: z.string(),
  publicUrl: z.string().url(),
})), async (c) => {
  const { mediaId, publicUrl } = c.req.valid('json');
  const user = c.get('user');

  // G15: O Ecossistema reconhece a nova mídia (ex: para processamento ML, moderação)
  void eventBus.publishWithOutbox(DomainEventName.MEDIA_UPLOADED as any, {
    mediaId,
    uploaderId: user.id,
    url: publicUrl,
  });

  return c.json({ success: true, url: publicUrl });
});
