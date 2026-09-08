import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VIDEO_MULTIPART_PART_SIZE_BYTES } from '@pdc/shared';

const strapiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));
const storageMock = vi.hoisted(() => ({
  configured: true,
  create: vi.fn(),
  presignPart: vi.fn(),
  complete: vi.fn(),
  abort: vi.fn(),
  exists: vi.fn(),
}));
const publishWithOutbox = vi.hoisted(() => vi.fn());

vi.mock('../strapi/strapi.client.js', () => ({
  strapiGet: strapiMock.get,
  strapiPost: strapiMock.post,
  strapiPut: strapiMock.put,
}));
vi.mock('../media/r2.service.js', () => ({
  abortMultipartUpload: storageMock.abort,
  completeMultipartUpload: storageMock.complete,
  createMultipartUpload: storageMock.create,
  generateMultipartPartUploadUrl: storageMock.presignPart,
  isR2Configured: () => storageMock.configured,
  r2ObjectExists: storageMock.exists,
}));
vi.mock('../media/file-type-guard.js', () => ({
  ALLOWED_MEDIA_MIME_TYPES: new Set(['video/mp4']),
}));
vi.mock('../events/event-bus.js', () => ({
  eventBus: { publishWithOutbox },
}));

const mentor = { id: 'mentor-1', role: 'mentor' as const };
const institution = { id: 'institution-1', role: 'instituicao' as const };
const student = { id: 'student-1', role: 'estudante' as const };

function videoRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 9,
    documentId: 'video-professional',
    provider: 'r2',
    mode: 'professional_upload',
    visibility: 'protected',
    status: 'pending_upload',
    ownerId: institution.id,
    title: 'Aula longa',
    originalKey: 'videos/institution-1/aula.mp4',
    multipartUploadId: 'upload-1',
    mimeType: 'video/mp4',
    sizeBytes: String(2 * VIDEO_MULTIPART_PART_SIZE_BYTES),
    ...overrides,
  };
}

describe('videoMultipartService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMock.configured = true;
    storageMock.create.mockResolvedValue('upload-1');
    storageMock.presignPart.mockResolvedValue('https://r2.example.com/part-1');
    storageMock.complete.mockResolvedValue(undefined);
    storageMock.abort.mockResolvedValue(undefined);
    storageMock.exists.mockResolvedValue(false);
  });

  it('creates an R2 multipart session for a professional institution upload', async () => {
    strapiMock.post.mockImplementationOnce((_path: string, payload: Record<string, unknown>) =>
      Promise.resolve({
        data: { id: 9, documentId: 'video-professional', ...payload },
      })
    );
    const { videoMultipartService } = await import('./video-multipart.service.js');

    const result = await videoMultipartService.create(
      {
        mode: 'professional_upload',
        visibility: 'protected',
        title: 'Aula longa',
        filename: 'aula.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 600 * 1024 * 1024,
      },
      institution
    );

    expect(result.uploadMethod).toBe('multipart');
    expect(result.totalParts).toBe(60);
    expect(storageMock.create).toHaveBeenCalledWith(
      expect.stringMatching(/^videos\/institution-1\//),
      'video/mp4'
    );
    expect(strapiMock.post).toHaveBeenCalledWith(
      '/videos',
      expect.objectContaining({
        multipartUploadId: 'upload-1',
        mode: 'professional_upload',
      })
    );
  });

  it('aborta a sessão R2 quando a criação da metadata falha', async () => {
    strapiMock.post.mockRejectedValueOnce(Object.assign(new Error('Strapi indisponível'), {
      status: 503,
    }));
    const { videoMultipartService } = await import('./video-multipart.service.js');

    await expect(videoMultipartService.create(
      {
        mode: 'professional_upload',
        visibility: 'protected',
        title: 'Aula longa',
        filename: 'aula.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 600 * 1024 * 1024,
      },
      institution
    )).rejects.toMatchObject({ status: 503 });

    expect(storageMock.abort).toHaveBeenCalledWith(
      expect.stringMatching(/^videos\/institution-1\//),
      'upload-1'
    );
  });

  it('enforces professional upload limits by role before creating R2 state', async () => {
    const { videoMultipartService } = await import('./video-multipart.service.js');
    const payload = {
      mode: 'professional_upload' as const,
      visibility: 'protected' as const,
      title: 'Aula longa',
      filename: 'aula.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 51 * 1024 * 1024,
    };

    await expect(videoMultipartService.create(payload, student)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      videoMultipartService.create({ ...payload, sizeBytes: 501 * 1024 * 1024 }, mentor)
    ).rejects.toMatchObject({ status: 413 });
    expect(storageMock.create).not.toHaveBeenCalled();
  });

  it('authorizes a requested part against the persisted session and file size', async () => {
    strapiMock.get.mockResolvedValue({ data: [videoRecord()] });
    const { videoMultipartService } = await import('./video-multipart.service.js');

    await expect(
      videoMultipartService.createPartUrl(
        'video-professional',
        { uploadId: 'upload-1', partNumber: 2 },
        institution
      )
    ).resolves.toEqual({
      uploadUrl: 'https://r2.example.com/part-1',
      partNumber: 2,
    });
    expect(storageMock.presignPart).toHaveBeenCalledWith(
      'videos/institution-1/aula.mp4',
      'upload-1',
      2
    );

    await expect(
      videoMultipartService.createPartUrl(
        'video-professional',
        { uploadId: 'upload-1', partNumber: 3 },
        institution
      )
    ).rejects.toMatchObject({ status: 400 });
  });

  it('completes every ordered part and makes the protected original playable', async () => {
    strapiMock.get.mockResolvedValue({ data: [videoRecord()] });
    strapiMock.put.mockResolvedValue({
      data: videoRecord({ status: 'ready', multipartUploadId: null }),
    });
    const { videoMultipartService } = await import('./video-multipart.service.js');

    const video = await videoMultipartService.complete(
      'video-professional',
      {
        uploadId: 'upload-1',
        parts: [
          { partNumber: 2, etag: 'etag-2' },
          { partNumber: 1, etag: 'etag-1' },
        ],
      },
      institution
    );

    expect(storageMock.complete).toHaveBeenCalledWith('videos/institution-1/aula.mp4', 'upload-1', [
      { partNumber: 1, etag: 'etag-1' },
      { partNumber: 2, etag: 'etag-2' },
    ]);
    expect(strapiMock.put).toHaveBeenCalledWith(
      '/videos/video-professional',
      expect.objectContaining({ status: 'ready' })
    );
    expect(video.status).toBe('ready');
    expect(publishWithOutbox).toHaveBeenCalledOnce();
  });

  it('rejects incomplete completion lists without touching R2', async () => {
    strapiMock.get.mockResolvedValue({ data: [videoRecord()] });
    const { videoMultipartService } = await import('./video-multipart.service.js');

    await expect(
      videoMultipartService.complete(
        'video-professional',
        {
          uploadId: 'upload-1',
          parts: [{ partNumber: 1, etag: 'etag-1' }],
        },
        institution
      )
    ).rejects.toMatchObject({ status: 409 });
    expect(storageMock.complete).not.toHaveBeenCalled();
  });

  it('reconcilia conclusão R2 já realizada quando a escrita final falha', async () => {
    strapiMock.get
      .mockResolvedValueOnce({ data: [videoRecord()] })
      .mockResolvedValueOnce({ data: [videoRecord({ status: 'processing' })] });
    strapiMock.put
      .mockResolvedValueOnce({ data: videoRecord({ status: 'processing' }) })
      .mockRejectedValueOnce(Object.assign(new Error('Strapi indisponível'), { status: 503 }))
      .mockResolvedValueOnce({ data: videoRecord({ status: 'ready', multipartUploadId: null }) });
    storageMock.exists.mockResolvedValueOnce(true);
    const { videoMultipartService } = await import('./video-multipart.service.js');
    const payload = {
      uploadId: 'upload-1',
      parts: [
        { partNumber: 1, etag: 'etag-1' },
        { partNumber: 2, etag: 'etag-2' },
      ],
    };

    await expect(
      videoMultipartService.complete('video-professional', payload, institution)
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      videoMultipartService.complete('video-professional', payload, institution)
    ).resolves.toMatchObject({ status: 'ready' });

    expect(storageMock.complete).toHaveBeenCalledOnce();
    expect(storageMock.exists).toHaveBeenCalledWith('videos/institution-1/aula.mp4');
  });

  it('aborta uma sessão autorizada e persiste o estado de falha', async () => {
    strapiMock.get.mockResolvedValue({ data: [videoRecord()] });
    strapiMock.put.mockResolvedValue({ data: videoRecord({ status: 'failed' }) });
    const { videoMultipartService } = await import('./video-multipart.service.js');

    await expect(
      videoMultipartService.abort('video-professional', { uploadId: 'upload-1' }, institution)
    ).resolves.toBeUndefined();

    expect(storageMock.abort).toHaveBeenCalledWith('videos/institution-1/aula.mp4', 'upload-1');
    expect(strapiMock.put).toHaveBeenCalledWith('/videos/video-professional', {
      status: 'failed',
      multipartUploadId: null,
      failureReason: 'Upload multipart cancelado pelo utilizador.',
    });
  });

  it('não toca no R2 ao rejeitar o aborto de uma sessão alheia', async () => {
    strapiMock.get.mockResolvedValue({ data: [videoRecord()] });
    const { videoMultipartService } = await import('./video-multipart.service.js');

    await expect(
      videoMultipartService.abort('video-professional', { uploadId: 'upload-1' }, mentor)
    ).rejects.toMatchObject({ status: 403 });

    expect(storageMock.abort).not.toHaveBeenCalled();
    expect(strapiMock.put).not.toHaveBeenCalled();
  });
});
