import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { VIDEO_QUICK_UPLOAD_MAX_BYTES } from '@pdc/shared';
import { videoRoutes } from './videos.js';

const user = { id: 'mentor-1', role: 'mentor' };
const videoServiceMock = vi.hoisted(() => ({
  createExternal: vi.fn(),
  createR2: vi.fn(),
  uploadContent: vi.fn(),
  authorizeContentUpload: vi.fn(),
  uploadAuthorizedContent: vi.fn(),
  confirmUpload: vi.fn(),
  getPlayback: vi.fn(),
}));
const videoMultipartServiceMock = vi.hoisted(() => ({
  createPartUrl: vi.fn(),
  complete: vi.fn(),
  abort: vi.fn(),
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
vi.mock('../modules/videos/video-multipart.service.js', () => ({
  videoMultipartService: videoMultipartServiceMock,
}));
vi.mock('../middleware/rateLimit.js', () => ({
  rateLimitContentCreate: async (_c: Context, next: Next) => {
    await next();
  },
}));

describe('videoRoutes', () => {
  const app = new Hono().route('/videos', videoRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
    videoServiceMock.authorizeContentUpload.mockResolvedValue({
      key: 'videos/mentor-1/aula.mp4',
      mimeType: 'video/mp4',
    });
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
    expect(videoServiceMock.createExternal).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'youtube',
      }),
      user
    );
  });

  it('preserves a semantic unavailable-storage response from video creation', async () => {
    videoServiceMock.createR2.mockRejectedValueOnce(
      Object.assign(
        new Error('Upload profissional indisponível: armazenamento R2 não configurado.'),
        { status: 503 }
      )
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

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: 'Upload profissional indisponível: armazenamento R2 não configurado.',
    });
  });

  it('accepts authenticated direct video bytes for the local storage fallback', async () => {
    videoServiceMock.uploadAuthorizedContent.mockResolvedValueOnce(undefined);
    const bytes = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);

    const res = await app.request('/videos/video-1/content', {
      method: 'PUT',
      body: bytes,
      headers: { 'Content-Type': 'video/mp4' },
    });

    expect(res.status).toBe(204);
    expect(videoServiceMock.authorizeContentUpload).toHaveBeenCalledWith(
      'video-1',
      'video/mp4',
      user
    );
    expect(videoServiceMock.uploadAuthorizedContent).toHaveBeenCalledWith(
      { key: 'videos/mentor-1/aula.mp4', mimeType: 'video/mp4' },
      expect.any(Uint8Array)
    );
  });

  it('normalizes the declared MIME type before authorization', async () => {
    const res = await app.request('/videos/video-1/content', {
      method: 'PUT',
      body: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]),
      headers: { 'Content-Type': 'VIDEO/MP4; Charset=binary' },
    });

    expect(res.status).toBe(204);
    expect(videoServiceMock.authorizeContentUpload).toHaveBeenCalledWith(
      'video-1',
      'video/mp4',
      user
    );
  });

  it('returns the storage error when an authorized direct upload cannot be persisted', async () => {
    videoServiceMock.uploadAuthorizedContent.mockRejectedValueOnce(
      Object.assign(new Error('Serviço de armazenamento temporariamente indisponível'), {
        status: 502,
      })
    );

    const res = await app.request('/videos/video-1/content', {
      method: 'PUT',
      body: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]),
      headers: { 'Content-Type': 'video/mp4' },
    });

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: 'Serviço de armazenamento temporariamente indisponível',
    });
    expect(videoServiceMock.authorizeContentUpload).toHaveBeenCalledOnce();
    expect(videoServiceMock.uploadAuthorizedContent).toHaveBeenCalledOnce();
  });

  it('authorizes the video before consuming the request stream', async () => {
    const events: string[] = [];
    videoServiceMock.authorizeContentUpload.mockImplementationOnce(() => {
      events.push('authorized');
      return Promise.resolve({ key: 'videos/mentor-1/aula.mp4', mimeType: 'video/mp4' });
    });
    videoServiceMock.uploadAuthorizedContent.mockImplementationOnce(() => {
      events.push('stored');
      return Promise.resolve();
    });
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        events.push('read');
        controller.enqueue(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]));
        controller.close();
      },
    });
    const init = {
      method: 'PUT' as const,
      body: stream,
      duplex: 'half' as const,
      headers: { 'Content-Type': 'video/mp4' },
    };

    const res = await app.fetch(new Request('http://localhost/videos/video-1/content', init));

    expect(res.status).toBe(204);
    expect(events).toEqual(['authorized', 'read', 'stored']);
  });

  it.each([
    { status: 404, message: 'Vídeo não encontrado' },
    { status: 403, message: 'Sem permissão para gerir este vídeo' },
    { status: 409, message: 'Este vídeo não aceita upload de conteúdo' },
    { status: 415, message: 'Tipo de vídeo não permitido pelo ecossistema.' },
  ])(
    'preserves the semantic $status response from direct upload validation',
    async ({ status, message }) => {
      videoServiceMock.authorizeContentUpload.mockRejectedValueOnce(
        Object.assign(new Error(message), { status })
      );

      const res = await app.request('/videos/video-1/content', {
        method: 'PUT',
        body: new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]),
        headers: { 'Content-Type': 'video/mp4' },
      });

      expect(res.status).toBe(status);
      await expect(res.json()).resolves.toEqual({ error: message });
      expect(videoServiceMock.uploadAuthorizedContent).not.toHaveBeenCalled();
    }
  );

  it('rejects a direct upload above 50 MB before reading its body', async () => {
    const request = new Request('http://localhost/videos/video-1/content', {
      method: 'PUT',
      body: new Uint8Array([0]),
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(VIDEO_QUICK_UPLOAD_MAX_BYTES + 1),
      },
    });
    const res = await app.fetch(request);

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: 'Upload rápido de vídeo limitado a 50MB.' });
    expect(videoServiceMock.authorizeContentUpload).not.toHaveBeenCalled();
    expect(videoServiceMock.uploadAuthorizedContent).not.toHaveBeenCalled();
  });

  it('rejects oversized direct-upload bytes when Content-Length is absent', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(VIDEO_QUICK_UPLOAD_MAX_BYTES + 1));
        controller.close();
      },
    });
    const requestInit: RequestInit & { duplex: 'half' } = {
      method: 'PUT',
      body: stream,
      headers: { 'Content-Type': 'video/mp4' },
      duplex: 'half',
    };
    const res = await app.fetch(
      new Request('http://localhost/videos/video-1/content', requestInit)
    );

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: 'Upload rápido de vídeo limitado a 50MB.' });
    expect(videoServiceMock.uploadAuthorizedContent).not.toHaveBeenCalled();
  });

  it('preserves the 413 response when stream cancellation rejects', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(VIDEO_QUICK_UPLOAD_MAX_BYTES + 1));
      },
      cancel() {
        return Promise.reject(new Error('cancel failed'));
      },
    });

    const requestInit: RequestInit & { duplex: 'half' } = {
      method: 'PUT',
      body: stream,
      headers: { 'Content-Type': 'video/mp4' },
      duplex: 'half',
    };
    const res = await app.fetch(
      new Request('http://localhost/videos/video-1/content', requestInit)
    );

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({ error: 'Upload rápido de vídeo limitado a 50MB.' });
    expect(videoServiceMock.uploadAuthorizedContent).not.toHaveBeenCalled();
  });

  it('rejects direct uploads without a declared media type', async () => {
    const res = await app.request('/videos/video-1/content', {
      method: 'PUT',
      body: new Uint8Array([0]),
    });

    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toEqual({ error: 'Tipo de vídeo não informado.' });
    expect(videoServiceMock.authorizeContentUpload).not.toHaveBeenCalled();
    expect(videoServiceMock.uploadAuthorizedContent).not.toHaveBeenCalled();
  });

  it('rejects a declared zero-byte direct upload before authorization', async () => {
    const res = await app.fetch(
      new Request('http://localhost/videos/video-1/content', {
        method: 'PUT',
        body: new Uint8Array(0),
        headers: { 'Content-Type': 'video/mp4', 'Content-Length': '0' },
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'O vídeo enviado está vazio.' });
    expect(videoServiceMock.authorizeContentUpload).not.toHaveBeenCalled();
    expect(videoServiceMock.uploadAuthorizedContent).not.toHaveBeenCalled();
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
