import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VIDEO_QUICK_UPLOAD_MAX_BYTES } from '@pdc/shared';

const strapiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({
  configured: false,
  presign: vi.fn(),
  presignRead: vi.fn(),
  publicUrl: vi.fn(),
  upload: vi.fn(),
}));
const fileGuardMock = vi.hoisted(() => ({ validate: vi.fn() }));
const multipartMock = vi.hoisted(() => ({ create: vi.fn() }));
const envMock = vi.hoisted(() => ({
  API_URL: 'http://localhost:3001',
  NODE_ENV: 'test',
}));

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiMock.get,
  strapiPost: strapiMock.post,
  strapiPut: strapiMock.put,
}));
vi.mock('../media/r2.service.js', () => ({
  generatePresignedReadUrl: storageMock.presignRead,
  generatePresignedUrl: storageMock.presign,
  getPublicUrl: storageMock.publicUrl,
  isR2Configured: () => storageMock.configured,
  uploadToR2: storageMock.upload,
}));
vi.mock('../media/file-type-guard.js', () => ({
  ALLOWED_MEDIA_MIME_TYPES: new Set(['video/mp4']),
  validateMagicBytes: fileGuardMock.validate,
}));
vi.mock('../events/event-bus.js', () => ({
  eventBus: { publishWithOutbox: vi.fn() },
}));
vi.mock('../cursos/cursos.service.js', () => ({
  cursosService: {},
}));
vi.mock('./video-multipart.service.js', () => ({
  videoMultipartService: multipartMock,
}));
vi.mock('../../lib/env.js', () => ({
  env: envMock,
}));

const owner = { id: 'mentor-1', role: 'mentor' as const };

function pendingVideo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'video-local',
    provider: 'r2',
    mode: 'quick_upload',
    visibility: 'protected',
    status: 'pending_upload',
    ownerId: 'mentor-1',
    title: 'Aula privada',
    originalKey: 'videos/mentor-1/aula.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 8,
    ...overrides,
  };
}

describe('videoService quick upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.configured = false;
    envMock.API_URL = 'http://localhost:3001';
    envMock.NODE_ENV = 'test';
    fileGuardMock.validate.mockResolvedValue({ ok: true });
    storageMock.upload.mockResolvedValue(undefined);
  });

  it('does not expose the local direct-upload fallback in production', async () => {
    envMock.NODE_ENV = 'production';
    const { videoService } = await import('./video.service.js');

    await expect(
      videoService.createR2(
        {
          mode: 'quick_upload',
          visibility: 'protected',
          title: 'Aula privada',
          filename: 'aula.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 1024,
        },
        owner
      )
    ).rejects.toMatchObject({
      message: 'Upload de vídeo indisponível: armazenamento R2 não configurado.',
      status: 503,
    });
    expect(strapiMock.post).not.toHaveBeenCalled();
  });

  it('normalizes the API base URL used by the local direct-upload fallback', async () => {
    envMock.API_URL = 'http://localhost:3001///';
    strapiMock.post.mockImplementationOnce((_path: string, payload: Record<string, unknown>) =>
      Promise.resolve({ data: { id: 1, documentId: 'video-local', ...payload } })
    );
    const { videoService } = await import('./video.service.js');

    const created = await videoService.createR2(
      {
        mode: 'quick_upload',
        visibility: 'protected',
        title: 'Aula privada',
        filename: 'aula.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      },
      owner
    );

    if (created.uploadMethod === 'multipart') throw new Error('Esperava upload rápido direto');
    expect(created.uploadUrl).toBe('http://localhost:3001/videos/video-local/content');
  });

  it('returns an authenticated direct upload URL when R2 credentials are absent locally', async () => {
    strapiMock.post.mockImplementationOnce((_path: string, payload: Record<string, unknown>) =>
      Promise.resolve({
        data: {
          id: 1,
          documentId: 'video-local',
          ...payload,
          sizeBytes: '1024',
          durationSeconds: null,
          thumbnailUrl: null,
          streamUrl: null,
          externalUrl: null,
          chapters: null,
          subtitles: null,
          failureReason: null,
        },
      })
    );
    const { videoService } = await import('./video.service.js');

    const created = await videoService.createR2(
      {
        mode: 'quick_upload',
        visibility: 'protected',
        title: 'Aula privada',
        filename: 'aula.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      },
      owner
    );

    expect(created.uploadMethod).toBe('direct');
    if (created.uploadMethod === 'multipart') throw new Error('Esperava upload rápido direto');
    expect(created.uploadUrl).toBe('http://localhost:3001/videos/video-local/content');
    expect(created.video.sizeBytes).toBe(1024);
    expect(storageMock.presign).not.toHaveBeenCalled();
  });

  it('keeps browser-to-R2 upload when credentials are configured', async () => {
    storageMock.configured = true;
    storageMock.presign.mockResolvedValue('https://r2.example.com/signed-upload');
    strapiMock.post.mockImplementationOnce((_path: string, payload: Record<string, unknown>) =>
      Promise.resolve({
        data: { id: 'video-r2', ...payload },
      })
    );
    const { videoService } = await import('./video.service.js');

    const created = await videoService.createR2(
      {
        mode: 'quick_upload',
        visibility: 'protected',
        title: 'Aula privada',
        filename: 'aula.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024,
      },
      owner
    );

    expect(created.uploadMethod).toBe('presigned');
    if (created.uploadMethod === 'multipart') throw new Error('Esperava upload rápido presigned');
    expect(created.uploadUrl).toBe('https://r2.example.com/signed-upload');
  });

  it('delegates professional uploads to the multipart service', async () => {
    const multipartResponse = {
      video: {
        id: 'video-professional',
        provider: 'r2' as const,
        mode: 'professional_upload' as const,
        visibility: 'protected' as const,
        status: 'pending_upload' as const,
        ownerId: owner.id,
        title: 'Aula longa',
      },
      uploadMethod: 'multipart' as const,
      key: 'videos/mentor-1/aula-longa.mp4',
      uploadId: 'upload-1',
      partSizeBytes: 10 * 1024 * 1024,
      totalParts: 6,
    };
    multipartMock.create.mockResolvedValueOnce(multipartResponse);
    const { videoService } = await import('./video.service.js');
    const payload = {
      mode: 'professional_upload' as const,
      visibility: 'protected' as const,
      title: 'Aula longa',
      filename: 'aula-longa.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 60 * 1024 * 1024,
    };

    await expect(videoService.createR2(payload, owner)).resolves.toEqual(multipartResponse);
    expect(multipartMock.create).toHaveBeenCalledWith(payload, owner);
    expect(strapiMock.post).not.toHaveBeenCalled();
  });

  it('validates and stores direct upload bytes using the canonical media storage', async () => {
    strapiMock.get.mockResolvedValue({
      data: [pendingVideo()],
    });
    const { videoService } = await import('./video.service.js');
    const bytes = Uint8Array.from([0, 0, 0, 24, 102, 116, 121, 112]);

    await expect(
      videoService.uploadContent('video-local', bytes, 'video/mp4', owner)
    ).resolves.toBeUndefined();
    expect(strapiMock.get).toHaveBeenCalledWith('/videos', {
      'filters[documentId][$eq]': 'video-local',
      'pagination[pageSize]': '1',
    });
    expect(fileGuardMock.validate).toHaveBeenCalledWith(expect.any(Buffer), 'video/mp4');
    expect(storageMock.upload).toHaveBeenCalledWith(
      'videos/mentor-1/aula.mp4',
      expect.any(Buffer),
      'video/mp4'
    );
  });

  it('consulta identificadores numéricos pelo id legado', async () => {
    strapiMock.get.mockResolvedValue({ data: [pendingVideo({ id: 9 })] });
    const { videoService } = await import('./video.service.js');

    await videoService.authorizeContentUpload('9', 'video/mp4', owner);

    expect(strapiMock.get).toHaveBeenCalledWith('/videos', {
      'filters[id][$eq]': '9',
      'pagination[pageSize]': '1',
    });
  });

  it('rejects a missing video before touching storage', async () => {
    strapiMock.get.mockResolvedValue({ data: [] });
    const { videoService } = await import('./video.service.js');

    await expect(
      videoService.uploadContent('missing', new Uint8Array([1]), 'video/mp4', owner)
    ).rejects.toMatchObject({ message: 'Vídeo não encontrado', status: 404 });
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'outro proprietário',
      record: pendingVideo({ ownerId: 'mentor-2' }),
      message: 'Sem permissão para gerir este vídeo',
      status: 403,
    },
    {
      label: 'estado não pendente',
      record: pendingVideo({ status: 'ready' }),
      message: 'Este vídeo não aceita upload de conteúdo',
      status: 409,
    },
  ])('rejects $label before touching storage', async ({ record, message, status }) => {
    strapiMock.get.mockResolvedValue({ data: [record] });
    const { videoService } = await import('./video.service.js');

    await expect(
      videoService.uploadContent('video-local', new Uint8Array([1]), 'video/mp4', owner)
    ).rejects.toMatchObject({ message, status });
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it('rejects a MIME type different from the reserved upload', async () => {
    strapiMock.get.mockResolvedValue({ data: [pendingVideo()] });
    const { videoService } = await import('./video.service.js');

    await expect(
      videoService.uploadContent('video-local', new Uint8Array([1]), 'video/webm', owner)
    ).rejects.toMatchObject({
      message: 'Tipo de vídeo não permitido pelo ecossistema.',
      status: 415,
    });
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'vazio', body: new Uint8Array(0), status: 400 },
    {
      label: 'acima de 50 MB',
      body: new Uint8Array(VIDEO_QUICK_UPLOAD_MAX_BYTES + 1),
      status: 413,
    },
  ])('rejects a $label body before touching storage', async ({ body, status }) => {
    strapiMock.get.mockResolvedValue({ data: [pendingVideo()] });
    const { videoService } = await import('./video.service.js');

    await expect(
      videoService.uploadContent('video-local', body, 'video/mp4', owner)
    ).rejects.toMatchObject({ status });
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it('rejects bytes that do not match the declared MP4 type', async () => {
    strapiMock.get.mockResolvedValue({ data: [pendingVideo()] });
    fileGuardMock.validate.mockResolvedValueOnce({ ok: false, reason: 'Assinatura MP4 inválida.' });
    const { videoService } = await import('./video.service.js');

    await expect(
      videoService.uploadContent('video-local', new Uint8Array([1, 2, 3]), 'video/mp4', owner)
    ).rejects.toMatchObject({ message: 'Assinatura MP4 inválida.', status: 415 });
    expect(storageMock.upload).not.toHaveBeenCalled();
  });
});
