import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { videoRoutes } from './videos.js';

const user = { id: 'mentor-1', role: 'mentor' };
const videoMultipartServiceMock = vi.hoisted(() => ({
  createPartUrl: vi.fn(),
  complete: vi.fn(),
  abort: vi.fn(),
}));
const rateLimitMock = vi.hoisted(() => vi.fn());

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', user);
    await next();
  },
  optionalJwt: async (c: Context, next: Next) => {
    c.set('user', user);
    await next();
  },
}));
vi.mock('../modules/videos/video.service.js', () => ({
  videoService: {
    createExternal: vi.fn(),
    createR2: vi.fn(),
    authorizeContentUpload: vi.fn(),
    uploadAuthorizedContent: vi.fn(),
    confirmUpload: vi.fn(),
    getPlayback: vi.fn(),
  },
}));
vi.mock('../modules/videos/video-multipart.service.js', () => ({
  videoMultipartService: videoMultipartServiceMock,
}));
vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitContentCreate: rateLimitMock,
}));

describe('video multipart routes', () => {
  const app = new Hono().route('/videos', videoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitMock.mockImplementation(async (_context: unknown, next: () => Promise<void>) => {
      await next();
    });
  });

  it('creates a signed URL for an authorized part', async () => {
    videoMultipartServiceMock.createPartUrl.mockResolvedValueOnce({
      uploadUrl: 'https://r2.example.com/part-2',
      partNumber: 2,
    });
    const payload = { uploadId: 'upload-1', partNumber: 2 };

    const res = await app.request('/videos/video-1/multipart/parts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      uploadUrl: 'https://r2.example.com/part-2',
      partNumber: 2,
    });
    expect(videoMultipartServiceMock.createPartUrl).toHaveBeenCalledWith('video-1', payload, user);
    expect(rateLimitMock).toHaveBeenCalledOnce();
  });

  it('maps part URL errors without requesting another operation', async () => {
    videoMultipartServiceMock.createPartUrl.mockRejectedValueOnce(
      Object.assign(new Error('Parte fora do intervalo.'), { status: 400 })
    );

    const res = await app.request('/videos/video-1/multipart/parts', {
      method: 'POST',
      body: JSON.stringify({ uploadId: 'upload-1', partNumber: 2 }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Parte fora do intervalo.' });
    expect(videoMultipartServiceMock.complete).not.toHaveBeenCalled();
    expect(videoMultipartServiceMock.abort).not.toHaveBeenCalled();
  });

  it('completes an authorized upload', async () => {
    const readyVideo = {
      id: 'video-1',
      provider: 'r2',
      mode: 'professional_upload',
      visibility: 'protected',
      status: 'ready',
      ownerId: 'mentor-1',
      title: 'Aula longa',
    };
    videoMultipartServiceMock.complete.mockResolvedValueOnce(readyVideo);
    const payload = { uploadId: 'upload-1', parts: [{ partNumber: 1, etag: 'etag-1' }] };

    const res = await app.request('/videos/video-1/multipart/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(readyVideo);
    expect(videoMultipartServiceMock.complete).toHaveBeenCalledWith('video-1', payload, user);
    expect(rateLimitMock).toHaveBeenCalledOnce();
  });

  it('maps completion errors without reporting success', async () => {
    videoMultipartServiceMock.complete.mockRejectedValueOnce(
      Object.assign(new Error('Sessão multipart inválida.'), { status: 409 })
    );
    const res = await app.request('/videos/video-1/multipart/complete', {
      method: 'POST',
      body: JSON.stringify({ uploadId: 'upload-1', parts: [{ partNumber: 1, etag: 'etag-1' }] }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ error: 'Sessão multipart inválida.' });
  });

  it('aborts an authorized upload', async () => {
    videoMultipartServiceMock.abort.mockResolvedValueOnce(undefined);
    const payload = { uploadId: 'upload-1' };

    const res = await app.request('/videos/video-1/multipart', {
      method: 'DELETE',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(videoMultipartServiceMock.abort).toHaveBeenCalledWith('video-1', payload, user);
    expect(rateLimitMock).toHaveBeenCalledOnce();
  });

  it('maps abort errors without hiding them', async () => {
    videoMultipartServiceMock.abort.mockRejectedValueOnce(
      Object.assign(new Error('Vídeo não encontrado.'), { status: 404 })
    );
    const res = await app.request('/videos/video-1/multipart', {
      method: 'DELETE',
      body: JSON.stringify({ uploadId: 'upload-1' }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'Vídeo não encontrado.' });
  });
});
