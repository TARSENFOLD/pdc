import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  ConfirmVideoUploadPayloadSchema,
  CreateExternalVideoPayloadSchema,
  CreateR2VideoPayloadSchema,
} from '@pdc/shared';
import { optionalJwt, verifyJwt, type OptionalAuthVariables } from '../modules/auth/auth.middleware.js';
import { videoService } from '../modules/videos/video.service.js';

type Vars = { Variables: OptionalAuthVariables };

export const videoRoutes = new Hono<Vars>();

type VideoErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 415 | 501 | 502;

function statusFromError(err: unknown): VideoErrorStatus {
  const status = (err as { status?: unknown }).status;
  if (
    status === 400 || status === 401 || status === 403 || status === 404 ||
    status === 409 || status === 413 || status === 415 || status === 501
  ) {
    return status;
  }
  return 502;
}

videoRoutes.post('/external', verifyJwt, zValidator('json', CreateExternalVideoPayloadSchema), async (c) => {
  try {
    const video = await videoService.createExternal(c.req.valid('json'), c.get('user'));
    return c.json(video, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, statusFromError(err));
  }
});

videoRoutes.post('/r2', verifyJwt, zValidator('json', CreateR2VideoPayloadSchema), async (c) => {
  try {
    const result = await videoService.createR2(c.req.valid('json'), c.get('user'));
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, statusFromError(err));
  }
});

videoRoutes.post('/:id/confirm', verifyJwt, zValidator('json', ConfirmVideoUploadPayloadSchema), async (c) => {
  try {
    const video = await videoService.confirmUpload(c.req.param('id'), c.req.valid('json'), c.get('user'));
    return c.json(video);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, statusFromError(err));
  }
});

videoRoutes.get('/:id/playback', optionalJwt, async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) return c.json({ error: 'Vídeo não encontrado' }, 404);
    const playback = await videoService.getPlayback(id, c.get('user'), c.req.query('courseId'));
    return c.json(playback);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Erro interno' }, statusFromError(err));
  }
});
