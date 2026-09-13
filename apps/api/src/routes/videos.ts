import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  AbortVideoMultipartUploadPayloadSchema,
  CompleteVideoMultipartUploadPayloadSchema,
  ConfirmVideoUploadPayloadSchema,
  CreateExternalVideoPayloadSchema,
  CreateR2VideoPayloadSchema,
  CreateVideoMultipartPartPayloadSchema,
  VIDEO_QUICK_UPLOAD_MAX_BYTES,
} from '@pdc/shared';
import {
  optionalJwt,
  verifyJwt,
  type OptionalAuthVariables,
} from '../modules/auth/auth.middleware.js';
import { videoService } from '../modules/videos/video.service.js';
import { videoMultipartService } from '../modules/videos/video-multipart.service.js';
import { rateLimitContentCreate } from '../middleware/rateLimit.js';

type Vars = { Variables: OptionalAuthVariables };

export const videoRoutes = new Hono<Vars>();

type VideoErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 501 | 502 | 503;

function statusFromError(err: unknown): VideoErrorStatus {
  const status =
    typeof err === 'object' && err !== null && 'status' in err ? err.status : undefined;
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 409 ||
    status === 413 ||
    status === 415 ||
    status === 501 ||
    status === 503
  ) {
    return status;
  }
  return 502;
}

async function readBodyWithLimit(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number
): Promise<Uint8Array> {
  if (!stream) return new Uint8Array(0);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    let chunk = await reader.read();
    while (!chunk.done) {
      totalBytes += chunk.value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw Object.assign(new Error('Upload rápido de vídeo limitado a 50MB.'), { status: 413 });
      }
      chunks.push(chunk.value);
      chunk = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }

  const onlyChunk = chunks[0];
  if (chunks.length === 1 && onlyChunk) return onlyChunk;

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

videoRoutes.post(
  '/external',
  verifyJwt,
  zValidator('json', CreateExternalVideoPayloadSchema),
  async (c) => {
    try {
      const video = await videoService.createExternal(c.req.valid('json'), c.get('user'));
      return c.json(video, 201);
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Erro interno' },
        statusFromError(err)
      );
    }
  }
);

videoRoutes.post('/r2', verifyJwt, zValidator('json', CreateR2VideoPayloadSchema), async (c) => {
  try {
    const result = await videoService.createR2(c.req.valid('json'), c.get('user'));
    return c.json(result, 201);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      statusFromError(err)
    );
  }
});

videoRoutes.put('/:id/content', verifyJwt, rateLimitContentCreate, async (c) => {
  try {
    const videoId = c.req.param('id');
    if (!videoId) return c.json({ error: 'Vídeo não encontrado.' }, 404);
    const rawContentLength = Number(c.req.header('content-length'));
    const contentLength =
      Number.isSafeInteger(rawContentLength) && rawContentLength >= 0
        ? rawContentLength
        : undefined;
    if (contentLength !== undefined && contentLength > VIDEO_QUICK_UPLOAD_MAX_BYTES) {
      return c.json({ error: 'Upload rápido de vídeo limitado a 50MB.' }, 413);
    }
    const mimeType = c.req.header('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (!mimeType) return c.json({ error: 'Tipo de vídeo não informado.' }, 415);
    if (contentLength === 0) return c.json({ error: 'O vídeo enviado está vazio.' }, 400);
    const authorization = await videoService.authorizeContentUpload(
      videoId,
      mimeType,
      c.get('user')
    );
    const body = await readBodyWithLimit(c.req.raw.body, VIDEO_QUICK_UPLOAD_MAX_BYTES);
    if (body.byteLength === 0) return c.json({ error: 'O vídeo enviado está vazio.' }, 400);

    await videoService.uploadAuthorizedContent(authorization, body);
    return c.body(null, 204);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      statusFromError(err)
    );
  }
});

videoRoutes.post(
  '/:id/confirm',
  verifyJwt,
  zValidator('json', ConfirmVideoUploadPayloadSchema),
  async (c) => {
    try {
      const video = await videoService.confirmUpload(
        c.req.param('id'),
        c.req.valid('json'),
        c.get('user')
      );
      return c.json(video);
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Erro interno' },
        statusFromError(err)
      );
    }
  }
);

videoRoutes.post(
  '/:id/multipart/parts',
  verifyJwt,
  rateLimitContentCreate,
  zValidator('json', CreateVideoMultipartPartPayloadSchema),
  async (c) => {
    try {
      const part = await videoMultipartService.createPartUrl(
        c.req.param('id'),
        c.req.valid('json'),
        c.get('user')
      );
      return c.json(part);
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Erro interno' },
        statusFromError(err)
      );
    }
  }
);

videoRoutes.post(
  '/:id/multipart/complete',
  verifyJwt,
  rateLimitContentCreate,
  zValidator('json', CompleteVideoMultipartUploadPayloadSchema),
  async (c) => {
    try {
      const video = await videoMultipartService.complete(
        c.req.param('id'),
        c.req.valid('json'),
        c.get('user')
      );
      return c.json(video);
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Erro interno' },
        statusFromError(err)
      );
    }
  }
);

videoRoutes.delete(
  '/:id/multipart',
  verifyJwt,
  rateLimitContentCreate,
  zValidator('json', AbortVideoMultipartUploadPayloadSchema),
  async (c) => {
    try {
      await videoMultipartService.abort(c.req.param('id'), c.req.valid('json'), c.get('user'));
      return c.body(null, 204);
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Erro interno' },
        statusFromError(err)
      );
    }
  }
);

videoRoutes.get('/:id/playback', optionalJwt, async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Vídeo não encontrado' }, 404);
    const playback = await videoService.getPlayback(id, c.get('user'), c.req.query('courseId'));
    return c.json(playback);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      statusFromError(err)
    );
  }
});
