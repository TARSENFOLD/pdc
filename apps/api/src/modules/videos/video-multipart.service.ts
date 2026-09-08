import crypto from 'node:crypto';
import pino from 'pino';
import {
  AbortVideoMultipartUploadPayloadSchema,
  CompleteVideoMultipartUploadPayloadSchema,
  CreateR2VideoPayloadSchema,
  CreateVideoMultipartPartPayloadSchema,
  ProfessionalR2VideoResponseSchema,
  VideoSchema,
  professionalVideoUploadLimit,
  VIDEO_MULTIPART_MAX_PARTS,
  VIDEO_MULTIPART_PART_SIZE_BYTES,
  type AbortVideoMultipartUploadPayload,
  type CompleteVideoMultipartUploadPayload,
  type CreateR2VideoPayload,
  type CreateR2VideoResponse,
  type CreateVideoMultipartPartPayload,
  type Video,
  type VideoMultipartPartResponse,
} from '@pdc/shared';
import type { AuthVariables } from '../auth/auth.middleware.js';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import { ALLOWED_MEDIA_MIME_TYPES } from '../media/file-type-guard.js';
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartUpload,
  generateMultipartPartUploadUrl,
  isR2Configured,
  r2ObjectExists,
} from '../media/r2.service.js';
import { strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';

const log = pino({ name: 'video-multipart-service' });

type AuthUser = AuthVariables['user'];
type ProfessionalR2VideoResponse = Extract<CreateR2VideoResponse, { uploadMethod: 'multipart' }>;

interface VideoRecord {
  id: string | number;
  documentId?: string;
  ownerId?: unknown;
  mode?: unknown;
  provider?: unknown;
  status?: unknown;
  originalKey?: unknown;
  multipartUploadId?: unknown;
  sizeBytes?: unknown;
  [key: string]: unknown;
}

function first<T>(data: T | T[] | undefined): T | undefined {
  return Array.isArray(data) ? data[0] : data;
}

function persistedId(record: VideoRecord): string {
  return record.documentId ?? String(record.id);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numericSize(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

function toVideo(record: VideoRecord): Video {
  const nullable = (value: unknown): unknown => (value === null ? undefined : value);
  return VideoSchema.parse({
    ...record,
    id: persistedId(record),
    sizeBytes: numericSize(record.sizeBytes),
    durationSeconds: nullable(record.durationSeconds),
    mimeType: nullable(record.mimeType),
    thumbnailUrl: nullable(record.thumbnailUrl),
    originalKey: nullable(record.originalKey),
    streamUrl: nullable(record.streamUrl),
    externalUrl: nullable(record.externalUrl),
    chapters: nullable(record.chapters),
    subtitles: nullable(record.subtitles),
    failureReason: nullable(record.failureReason),
  });
}

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function getVideoRecord(id: string): Promise<VideoRecord | undefined> {
  const filters = /^\d+$/.test(id)
    ? { 'filters[id][$eq]': id }
    : { 'filters[documentId][$eq]': id };
  const response = await strapiGet<VideoRecord>('/videos', {
    ...filters,
    'pagination[pageSize]': '1',
  });
  return first(response.data);
}

function authorizeSession(
  record: VideoRecord,
  uploadId: string,
  user: AuthUser
): { key: string; sizeBytes: number } {
  authorizeOwner(record, user);
  const resumableStatus = record.status === 'pending_upload' || record.status === 'processing';
  const key = optionalString(record.originalKey);
  const persistedUploadId = optionalString(record.multipartUploadId);
  const sizeBytes = numericSize(record.sizeBytes);
  if (
    record.provider !== 'r2' ||
    record.mode !== 'professional_upload' ||
    !resumableStatus ||
    !key ||
    !sizeBytes ||
    persistedUploadId !== uploadId
  ) {
    throw Object.assign(new Error('Sessão multipart inválida ou expirada'), { status: 409 });
  }
  return { key, sizeBytes };
}

function authorizeOwner(record: VideoRecord, user: AuthUser): void {
  if (record.ownerId !== user.id && !['moderador', 'super_admin'].includes(user.role)) {
    throw Object.assign(new Error('Sem permissão para gerir este vídeo'), { status: 403 });
  }
}

async function requireAuthorizedSession(videoId: string, uploadId: string, user: AuthUser) {
  const record = await getVideoRecord(videoId);
  if (!record) throw Object.assign(new Error('Vídeo não encontrado'), { status: 404 });
  return { record, ...authorizeSession(record, uploadId, user) };
}

async function persistReadyVideo(record: VideoRecord, user: AuthUser, key: string): Promise<Video> {
  const response = await strapiPut<VideoRecord>(`/videos/${persistedId(record)}`, {
    status: 'ready',
    multipartUploadId: null,
    failureReason: null,
  });
  const video = toVideo(response.data);
  await eventBus.publishWithOutbox(DomainEventName.MEDIA_UPLOADED, {
    mediaId: video.id,
    uploaderId: user.id,
    url: key,
  });
  return video;
}

export const videoMultipartService = {
  async create(
    rawPayload: CreateR2VideoPayload,
    user: AuthUser
  ): Promise<ProfessionalR2VideoResponse> {
    const payload = CreateR2VideoPayloadSchema.parse(rawPayload);
    if (payload.mode !== 'professional_upload') {
      throw Object.assign(new Error('Modo de upload profissional obrigatório'), { status: 400 });
    }
    if (!ALLOWED_MEDIA_MIME_TYPES.has(payload.mimeType) || !payload.mimeType.startsWith('video/')) {
      throw Object.assign(new Error('Tipo de vídeo não permitido pelo ecossistema.'), {
        status: 415,
      });
    }
    const roleLimit = professionalVideoUploadLimit(user.role);
    if (!roleLimit) {
      throw Object.assign(new Error('A tua conta não permite upload profissional de vídeo.'), {
        status: 403,
      });
    }
    if (payload.sizeBytes > roleLimit) {
      throw Object.assign(
        new Error('O vídeo excede o limite de upload profissional da tua conta.'),
        { status: 413 }
      );
    }
    if (!isR2Configured()) {
      throw Object.assign(
        new Error('Upload profissional indisponível: armazenamento R2 não configurado.'),
        { status: 503 }
      );
    }

    const totalParts = Math.ceil(payload.sizeBytes / VIDEO_MULTIPART_PART_SIZE_BYTES);
    if (totalParts > VIDEO_MULTIPART_MAX_PARTS) {
      throw Object.assign(new Error('O vídeo exige mais partes do que o permitido.'), {
        status: 413,
      });
    }
    const key = `videos/${user.id}/${crypto.randomUUID()}-${safeFilename(payload.filename)}`;
    const uploadId = await createMultipartUpload(key, payload.mimeType);
    try {
      const response = await strapiPost<VideoRecord>('/videos', {
        provider: 'r2',
        mode: payload.mode,
        visibility: payload.visibility,
        status: 'pending_upload',
        ownerId: user.id,
        title: payload.title,
        originalKey: key,
        multipartUploadId: uploadId,
        mimeType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
      });
      return ProfessionalR2VideoResponseSchema.parse({
        video: toVideo(response.data),
        uploadMethod: 'multipart',
        key,
        uploadId,
        partSizeBytes: VIDEO_MULTIPART_PART_SIZE_BYTES,
        totalParts,
      });
    } catch (err) {
      try {
        await abortMultipartUpload(key, uploadId);
      } catch (cleanupError) {
        log.error({ cleanupError, key }, 'Falha ao limpar sessão multipart sem metadata');
      }
      throw err;
    }
  },

  async createPartUrl(
    videoId: string,
    rawPayload: CreateVideoMultipartPartPayload,
    user: AuthUser
  ): Promise<VideoMultipartPartResponse> {
    const { uploadId, partNumber } = CreateVideoMultipartPartPayloadSchema.parse(rawPayload);
    const { record, key, sizeBytes } = await requireAuthorizedSession(videoId, uploadId, user);
    if (record.status !== 'pending_upload') {
      throw Object.assign(new Error('A conclusão deste upload já foi iniciada.'), { status: 409 });
    }
    const totalParts = Math.ceil(sizeBytes / VIDEO_MULTIPART_PART_SIZE_BYTES);
    if (partNumber > totalParts) {
      throw Object.assign(new Error('Número de parte fora do intervalo do vídeo.'), {
        status: 400,
      });
    }
    return {
      uploadUrl: await generateMultipartPartUploadUrl(key, uploadId, partNumber),
      partNumber,
    };
  },

  async complete(
    videoId: string,
    rawPayload: CompleteVideoMultipartUploadPayload,
    user: AuthUser
  ): Promise<Video> {
    const payload = CompleteVideoMultipartUploadPayloadSchema.parse(rawPayload);
    const existingRecord = await getVideoRecord(videoId);
    if (!existingRecord) throw Object.assign(new Error('Vídeo não encontrado'), { status: 404 });
    authorizeOwner(existingRecord, user);
    if (existingRecord.status === 'ready') return toVideo(existingRecord);
    const { record, key, sizeBytes } = {
      record: existingRecord,
      ...authorizeSession(existingRecord, payload.uploadId, user),
    };
    const totalParts = Math.ceil(sizeBytes / VIDEO_MULTIPART_PART_SIZE_BYTES);
    const orderedParts = [...payload.parts].sort(
      (left, right) => left.partNumber - right.partNumber
    );
    if (
      orderedParts.length !== totalParts ||
      orderedParts.some((part, index) => part.partNumber !== index + 1)
    ) {
      throw Object.assign(new Error('A lista de partes do vídeo está incompleta.'), {
        status: 409,
      });
    }
    if (record.status === 'pending_upload') {
      await strapiPut(`/videos/${persistedId(record)}`, {
        status: 'processing',
        failureReason: null,
      });
    }

    let objectCompleted = record.status === 'processing' && await r2ObjectExists(key);
    if (!objectCompleted) {
      try {
        await completeMultipartUpload(key, payload.uploadId, orderedParts);
        objectCompleted = true;
      } catch (err) {
        objectCompleted = await r2ObjectExists(key);
        if (!objectCompleted) throw err;
        log.warn({ videoId, key }, 'Conclusão multipart reconciliada após resposta ambígua do R2');
      }
    }
    return persistReadyVideo(record, user, key);
  },

  async abort(
    videoId: string,
    rawPayload: AbortVideoMultipartUploadPayload,
    user: AuthUser
  ): Promise<void> {
    const payload = AbortVideoMultipartUploadPayloadSchema.parse(rawPayload);
    const existingRecord = await getVideoRecord(videoId);
    if (!existingRecord) throw Object.assign(new Error('Vídeo não encontrado'), { status: 404 });
    authorizeOwner(existingRecord, user);
    if (existingRecord.status === 'ready') return;
    const { record, key } = {
      record: existingRecord,
      ...authorizeSession(existingRecord, payload.uploadId, user),
    };
    if (record.status === 'processing' && await r2ObjectExists(key)) {
      await persistReadyVideo(record, user, key);
      return;
    }
    await abortMultipartUpload(key, payload.uploadId);
    await strapiPut(`/videos/${persistedId(record)}`, {
      status: 'failed',
      multipartUploadId: null,
      failureReason: 'Upload multipart cancelado pelo utilizador.',
    });
  },
};
