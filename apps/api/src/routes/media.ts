import { Hono } from 'hono';
import { verifyJwt, type AuthVariables } from '../modules/auth/auth.middleware.js';
import { uploadToR2, getPublicUrl } from '../modules/media/r2.service.js';

type Vars = { Variables: AuthVariables };

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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

// POST /media/upload — upload de ficheiro para R2
mediaRoutes.post('/upload', async (c) => {
  const form = await c.req.parseBody();
  const fileField = form['file'];

  if (!fileField || typeof fileField === 'string' || Array.isArray(fileField)) {
    return c.json({ error: 'Campo "file" ausente ou inválido' }, 400);
  }

  // BodyDataValueDotAll pode incluir outros tipos não-File; narrowing via instanceof
  if (!(fileField instanceof File)) {
    return c.json({ error: 'Campo "file" deve ser um ficheiro' }, 400);
  }

  const file: File = fileField;

  if (file.size > MAX_SIZE_BYTES) {
    return c.json({ error: 'Ficheiro demasiado grande (máx 10 MB)' }, 413);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json({ error: 'Tipo de ficheiro não permitido' }, 415);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `uploads/${Date.now().toString()}-${safeName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadToR2(key, buffer, file.type);
    return c.json(
      {
        url: getPublicUrl(key),
        key,
        tamanhoBytes: file.size,
        mimeType: file.type,
      },
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return c.json({ error: message }, 502);
  }
});
