import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { videoRoutes } from './videos.js';

const user = { id: 'mentor-1', role: 'mentor' };
const videoServiceMock = vi.hoisted(() => ({
  createExternal: vi.fn(),
  createR2: vi.fn(),
  confirmUpload: vi.fn(),
  getPlayback: vi.fn(),
}));

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
  videoService: videoServiceMock,
}));

describe('videoRoutes', () => {
  const app = new Hono().route('/videos', videoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates external video metadata', async () => {
    videoServiceMock.createExternal.mockResolvedValueOnce({
      id: 'video-1',
      provider: 'youtube',
      mode: 'external',
      visibility: 'public',
      status: 'ready',
      ownerId: 'mentor-1',
      title: 'Trailer',
      externalUrl: 'https://www.youtube.com/watch?v=abc123',
    });

    const res = await app.request('/videos/external', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'youtube',
        title: 'Trailer',
        externalUrl: 'https://www.youtube.com/watch?v=abc123',
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(201);
    expect(videoServiceMock.createExternal).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'youtube',
    }), user);
  });

  it('rejects professional upload until multipart worker exists', async () => {
    videoServiceMock.createR2.mockRejectedValueOnce(
      Object.assign(new Error('Upload profissional requer multipart e worker dedicado.'), { status: 501 }),
    );

    const res = await app.request('/videos/r2', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'professional_upload',
        title: 'Curso longo',
        filename: 'aula.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 5_000_000_000,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(501);
    await expect(res.json()).resolves.toEqual({
      error: 'Upload profissional requer multipart e worker dedicado.',
    });
  });

  it('passes course context to playback authorization', async () => {
    videoServiceMock.getPlayback.mockResolvedValueOnce({
      videoId: 'video-1',
      provider: 'r2',
      playbackUrl: 'https://r2.example.com/signed',
      status: 'ready',
    });

    const res = await app.request('/videos/video-1/playback?courseId=curso-1');

    expect(res.status).toBe(200);
    expect(videoServiceMock.getPlayback).toHaveBeenCalledWith('video-1', user, 'curso-1');
  });
});
