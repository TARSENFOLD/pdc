import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { mediaRoutes } from './media.js';
import { MediaStorageError, uploadToR2 } from '../modules/media/r2.service.js';
import { DomainEventName } from '../modules/events/types.js';
import { UploadResultSchema } from '@pdc/shared';

const user = { id: 'user-1', role: 'estudante' };
const publishWithOutboxMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', user);
    await next();
  },
}));

vi.mock('../modules/media/r2.service.js', () => ({
  MediaStorageError: class MediaStorageError extends Error {
    constructor(public readonly code: string, options?: { cause?: unknown }) {
      super('Serviço de armazenamento temporariamente indisponível', options);
    }
  },
  generatePresignedUrl: vi.fn().mockResolvedValue('https://r2.example/upload'),
  getPublicUrl: vi.fn((key: string) => `http://localhost:3001/media/local/${key}`),
  isR2Ready: vi.fn().mockResolvedValue(true),
  readLocalUpload: vi.fn(),
  uploadToR2: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../modules/events/event-bus.js', () => ({
  eventBus: {
    publishWithOutbox: publishWithOutboxMock,
  },
}));

const jpegHeader = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

function fileBuffer(sizeBytes: number): Buffer {
  return Buffer.concat([jpegHeader, Buffer.alloc(Math.max(0, sizeBytes - jpegHeader.length))]);
}

function formWithFile(file: File, entityType?: string): FormData {
  const form = new FormData();
  form.set('file', file);
  if (entityType) {
    form.set('entityType', entityType);
  }
  return form;
}

describe('mediaRoutes', () => {
  const app = new Hono().route('/media', mediaRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita PDF disfarçado de JPEG com MIME_MISMATCH', async () => {
    const file = new File([Buffer.from('%PDF-1.7\n')], 'evil.jpg', { type: 'image/jpeg' });

    const res = await app.request('/media/upload', {
      method: 'POST',
      body: formWithFile(file, 'generic'),
    });

    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toEqual({
      error: 'Tipo detectado application/pdf não corresponde a image/jpeg declarado',
      code: 'MIME_MISMATCH',
    });
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it('aplica limite por entityType avatar antes do upload', async () => {
    const file = new File([fileBuffer(11 * 1024 * 1024)], 'avatar.jpg', { type: 'image/jpeg' });

    const res = await app.request('/media/upload', {
      method: 'POST',
      body: formWithFile(file, 'avatar'),
    });

    expect(res.status).toBe(413);
    await expect(res.json()).resolves.toEqual({
      error: 'Ficheiro excede o limite de 2MB para avatar.',
      code: 'SIZE_LIMIT_EXCEEDED',
    });
    expect(uploadToR2).not.toHaveBeenCalled();
  });

  it('usa entityType generic por default e devolve UploadResult', async () => {
    const file = new File([fileBuffer(4 * 1024 * 1024)], 'minha capa.jpg', { type: 'image/jpeg' });

    const res = await app.request('/media/upload', {
      method: 'POST',
      body: formWithFile(file),
    });

    expect(res.status).toBe(201);
    const body = UploadResultSchema.parse(await res.json());
    expect(typeof body.id).toBe('string');
    expect(body.url).toContain('/media/local/uploads/user-1/');
    expect(body.key).toContain('uploads/user-1/');
    expect(body).toMatchObject({
      filename: 'minha_capa.jpg',
      mimeType: 'image/jpeg',
      size: 4 * 1024 * 1024,
    });
    expect(uploadToR2).toHaveBeenCalledWith(expect.stringContaining('uploads/user-1/'), expect.any(Buffer), 'image/jpeg');
    expect(publishWithOutboxMock).toHaveBeenCalledWith(
      DomainEventName.MEDIA_UPLOADED,
      expect.objectContaining({
        mediaId: body.id,
        uploaderId: 'user-1',
        url: body.url,
      })
    );
  });

  it('aceita JPEG de 4MB para entityType capa', async () => {
    const file = new File([fileBuffer(4 * 1024 * 1024)], 'capa.jpg', { type: 'image/jpeg' });

    const res = await app.request('/media/upload', {
      method: 'POST',
      body: formWithFile(file, 'capa'),
    });

    expect(res.status).toBe(201);
    expect(uploadToR2).toHaveBeenCalledOnce();
  });

  it('não falha o upload quando a publicação do evento falha', async () => {
    publishWithOutboxMock.mockRejectedValueOnce(new Error('outbox indisponível'));
    const file = new File([fileBuffer(1024)], 'avatar.jpg', { type: 'image/jpeg' });

    const res = await app.request('/media/upload', {
      method: 'POST',
      body: formWithFile(file, 'avatar'),
    });

    expect(res.status).toBe(201);
    expect(uploadToR2).toHaveBeenCalledOnce();
  });

  it('mantém CORS quando o upload falha com erro interno', async () => {
    vi.mocked(uploadToR2).mockRejectedValueOnce(new Error('R2 down'));
    const file = new File([fileBuffer(1024)], 'avatar.jpg', { type: 'image/jpeg' });

    const res = await app.request('/media/upload', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:5173',
      },
      body: formWithFile(file, 'avatar'),
    });

    expect(res.status).toBe(502);
    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('devolve 503 estável quando as credenciais do storage são rejeitadas', async () => {
    vi.mocked(uploadToR2).mockRejectedValueOnce(
      new MediaStorageError('MEDIA_STORAGE_MISCONFIGURED', new Error('Unauthorized')),
    );
    const file = new File([fileBuffer(1024)], 'avatar.jpg', { type: 'image/jpeg' });

    const res = await app.request('/media/upload', {
      method: 'POST',
      headers: { Origin: 'http://localhost:5173' },
      body: formWithFile(file, 'avatar'),
    });

    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('60');
    await expect(res.json()).resolves.toEqual({
      error: 'Serviço de armazenamento temporariamente indisponível',
      code: 'MEDIA_STORAGE_MISCONFIGURED',
    });
  });
});
