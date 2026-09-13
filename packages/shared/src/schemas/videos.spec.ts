import { describe, expect, it } from 'vitest';
import {
  CompleteVideoMultipartUploadPayloadSchema,
  CreateExternalVideoPayloadSchema,
  CreateR2VideoPayloadSchema,
  CreateR2VideoResponseSchema,
  CreateVideoMultipartPartPayloadSchema,
  professionalVideoUploadLimit,
  VIDEO_MULTIPART_PART_SIZE_BYTES,
  VIDEO_PROFESSIONAL_UPLOAD_MAX_BYTES_BY_ROLE,
  VIDEO_QUICK_UPLOAD_MAX_BYTES,
  VideoPlaybackResponseSchema,
  VideoMultipartPartResponseSchema,
  VideoSchema,
} from './videos.js';

describe('Video contracts', () => {
  it('models protected R2 video metadata without storing bytes in Strapi', () => {
    const video = VideoSchema.parse({
      id: 'video-1',
      provider: 'r2',
      mode: 'quick_upload',
      visibility: 'protected',
      status: 'ready',
      ownerId: 'mentor-1',
      title: 'Aula 1',
      originalKey: 'videos/mentor-1/video-1.mp4',
      streamUrl: 'https://cdn.example.com/videos/mentor-1/video-1.mp4',
      sizeBytes: 20 * 1024 * 1024,
      mimeType: 'video/mp4',
    });

    expect(video.provider).toBe('r2');
    expect(video.originalKey).toContain('videos/mentor-1/');
  });

  it('normaliza thumbnail vazio e rejeita thumbnail inválido', () => {
    const fixture = {
      id: 'video-1',
      provider: 'r2' as const,
      mode: 'quick_upload' as const,
      visibility: 'protected' as const,
      status: 'ready' as const,
      ownerId: 'mentor-1',
      title: 'Aula 1',
    };

    expect(VideoSchema.parse({ ...fixture, thumbnailUrl: '' }).thumbnailUrl).toBeUndefined();
    const invalid = VideoSchema.safeParse({ ...fixture, thumbnailUrl: 'não-é-url' });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['thumbnailUrl'] }),
      ]));
    }
  });

  it('keeps external providers as references, not uploads', () => {
    const payload = CreateExternalVideoPayloadSchema.parse({
      provider: 'youtube',
      title: 'Trailer público',
      externalUrl: 'https://www.youtube.com/watch?v=abc123',
    });

    expect(payload.visibility).toBe('public');
  });

  it('defaults R2 video creation to protected quick upload', () => {
    const payload = CreateR2VideoPayloadSchema.parse({
      title: 'Demonstração',
      filename: 'demo.mp4',
      mimeType: 'video/mp4',
      sizeBytes: 1024,
    });

    expect(payload.mode).toBe('quick_upload');
    expect(payload.visibility).toBe('protected');
  });

  it('returns signed playback metadata', () => {
    const playback = VideoPlaybackResponseSchema.parse({
      videoId: 'video-1',
      provider: 'r2',
      playbackUrl: 'https://r2.example.com/signed',
      expiresAt: new Date().toISOString(),
      status: 'ready',
    });

    expect(playback.status).toBe('ready');
  });

  it('fixa o upload rápido em 50 MB e distingue envio direto de URL assinada', () => {
    expect(VIDEO_QUICK_UPLOAD_MAX_BYTES).toBe(50 * 1024 * 1024);
    const quickUpload = {
      mode: 'quick_upload' as const,
      visibility: 'protected' as const,
      title: 'Aula local',
      filename: 'aula.mp4',
      mimeType: 'video/mp4',
    };
    expect(CreateR2VideoPayloadSchema.safeParse({
      ...quickUpload,
      sizeBytes: VIDEO_QUICK_UPLOAD_MAX_BYTES,
    }).success).toBe(true);
    const oversizedQuickUpload = CreateR2VideoPayloadSchema.safeParse({
      ...quickUpload,
      sizeBytes: VIDEO_QUICK_UPLOAD_MAX_BYTES + 1,
    });
    expect(oversizedQuickUpload.success).toBe(false);
    if (!oversizedQuickUpload.success) {
      expect(oversizedQuickUpload.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['sizeBytes'], message: 'Upload rápido de vídeo limitado a 50MB.' }),
      ]));
    }
    expect(CreateR2VideoPayloadSchema.safeParse({
      ...quickUpload,
      mode: 'professional_upload',
      sizeBytes: VIDEO_QUICK_UPLOAD_MAX_BYTES + 1,
    }).success).toBe(true);

    const response = CreateR2VideoResponseSchema.parse({
      video: {
        id: 'video-local',
        provider: 'r2',
        mode: 'quick_upload',
        visibility: 'protected',
        status: 'pending_upload',
        ownerId: 'mentor-1',
        title: 'Aula local',
      },
      uploadUrl: 'http://localhost:3001/videos/video-local/content',
      uploadMethod: 'direct',
      key: 'videos/mentor-1/video-local.mp4',
    });

    expect(response.uploadMethod).toBe('direct');

    const presignedResponse = CreateR2VideoResponseSchema.parse({
      ...response,
      uploadMethod: 'presigned',
    });
    expect(presignedResponse.uploadMethod).toBe('presigned');

    const invalidProvider = CreateR2VideoResponseSchema.safeParse({
      ...response,
      video: { ...response.video, provider: 'youtube' },
    });
    expect(invalidProvider.success).toBe(false);
    if (!invalidProvider.success) {
      expect(invalidProvider.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['video', 'provider'] }),
      ]));
    }

    const mismatchedMode = CreateR2VideoResponseSchema.safeParse({
      ...response,
      uploadMethod: 'multipart',
      uploadId: 'upload-1',
      partSizeBytes: VIDEO_MULTIPART_PART_SIZE_BYTES,
      totalParts: 1,
    });
    expect(mismatchedMode.success).toBe(false);
    if (!mismatchedMode.success) {
      expect(mismatchedMode.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ['video', 'mode'] }),
      ]));
    }
  });

  it('aplica a política profissional por papel e modela uma sessão multipart', () => {
    expect(professionalVideoUploadLimit('estudante')).toBeUndefined();
    expect(professionalVideoUploadLimit('mentor')).toBe(500 * 1024 * 1024);
    expect(professionalVideoUploadLimit('instituicao')).toBe(5 * 1024 * 1024 * 1024);
    expect(professionalVideoUploadLimit('super_admin')).toBe(20 * 1024 * 1024 * 1024);

    const response = CreateR2VideoResponseSchema.parse({
      video: {
        id: 'video-longo',
        provider: 'r2',
        mode: 'professional_upload',
        visibility: 'protected',
        status: 'pending_upload',
        ownerId: 'instituicao-1',
        title: 'Aula longa',
      },
      uploadMethod: 'multipart',
      key: 'videos/instituicao-1/aula-longa.mp4',
      uploadId: 'upload-1',
      partSizeBytes: VIDEO_MULTIPART_PART_SIZE_BYTES,
      totalParts: 52,
    });

    expect(response.uploadMethod).toBe('multipart');
    expect(VIDEO_PROFESSIONAL_UPLOAD_MAX_BYTES_BY_ROLE.instituicao).toBeGreaterThan(500 * 1024 * 1024);
    if (response.uploadMethod !== 'multipart') throw new Error('Fixture multipart inválida');

    for (const field of ['uploadId', 'partSizeBytes', 'totalParts'] as const) {
      const invalid = { ...response, [field]: undefined };
      const result = CreateR2VideoResponseSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(expect.arrayContaining([
          expect.objectContaining({ path: [field] }),
        ]));
      }
    }
  });

  it('rejeita partes duplicadas ao concluir uma sessão multipart', () => {
    const result = CompleteVideoMultipartUploadPayloadSchema.safeParse({
      uploadId: 'upload-1',
      parts: [
        { partNumber: 1, etag: 'etag-1' },
        { partNumber: 1, etag: 'etag-repetido' },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({
          path: ['parts', 1, 'partNumber'],
          message: 'Cada parte deve aparecer apenas uma vez.',
        }),
      ]));
    }
  });

  it.each([
    [CreateVideoMultipartPartPayloadSchema, { uploadId: 'upload-1', partNumber: 0 }, ['partNumber']],
    [CreateR2VideoResponseSchema, {
      video: {
        id: 'video-1', provider: 'r2', mode: 'professional_upload', visibility: 'protected',
        status: 'pending_upload', ownerId: 'mentor-1', title: 'Aula longa',
      },
      uploadMethod: 'multipart', key: 'videos/mentor-1/aula.mp4', uploadId: 'upload-1',
      partSizeBytes: 1, totalParts: 1,
    }, ['partSizeBytes']],
    [CreateR2VideoResponseSchema, {
      video: {
        id: 'video-1', provider: 'r2', mode: 'professional_upload', visibility: 'protected',
        status: 'pending_upload', ownerId: 'mentor-1', title: 'Aula longa',
      },
      uploadMethod: 'multipart', key: 'videos/mentor-1/aula.mp4', uploadId: 'upload-1',
      partSizeBytes: VIDEO_MULTIPART_PART_SIZE_BYTES, totalParts: 0,
    }, ['totalParts']],
    [CompleteVideoMultipartUploadPayloadSchema, { uploadId: 'upload-1', parts: [] }, ['parts']],
    [VideoMultipartPartResponseSchema, { uploadUrl: 'não-é-url', partNumber: 1 }, ['uploadUrl']],
  ])('rejeita um campo multipart inválido no caminho %j', (schema, input, expectedPath) => {
    const result = schema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: expectedPath }),
      ]));
    }
  });
});
