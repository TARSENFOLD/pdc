import crypto from 'node:crypto';
import {
  ConfirmVideoUploadPayloadSchema,
  CreateExternalVideoPayloadSchema,
  CreateR2VideoPayloadSchema,
  QuickR2VideoResponseSchema,
  VideoPlaybackResponseSchema,
  VideoSchema,
  VIDEO_QUICK_UPLOAD_MAX_BYTES,
  type ConfirmVideoUploadPayload,
  type CreateExternalVideoPayload,
  type CreateR2VideoPayload,
  type CreateR2VideoResponse,
  type Video,
  type VideoPlaybackResponse,
} from '@pdc/shared';
import { strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import {
  generatePresignedReadUrl,
  generatePresignedUrl,
  getPublicUrl,
  isR2Configured,
  uploadToR2,
} from '../media/r2.service.js';
import { ALLOWED_MEDIA_MIME_TYPES, validateMagicBytes } from '../media/file-type-guard.js';
import { eventBus } from '../events/event-bus.js';
import { DomainEventName } from '../events/types.js';
import { cursosService } from '../cursos/cursos.service.js';
import type { AuthVariables } from '../auth/auth.middleware.js';
import { env } from '../../lib/env.js';
import { videoMultipartService } from './video-multipart.service.js';

const SIGNED_PLAYBACK_TTL_SECONDS = 15 * 60;

interface VideoRecord {
  id: string | number;
  documentId?: string;
  [key: string]: unknown;
}

type AuthUser = AuthVariables['user'];

export interface DirectVideoUploadAuthorization {
  key: string;
  mimeType: string;
}

function first<T>(data: T | T[] | undefined): T | undefined {
  return Array.isArray(data) ? data[0] : data;
}

function persistedId(video: VideoRecord): string {
  return video.documentId ?? String(video.id);
}

function nullableToUndefined(value: unknown): unknown {
  return value === null ? undefined : value;
}

function strapiBigIntegerToNumber(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return value;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
}

function toVideo(record: VideoRecord): Video {
  return VideoSchema.parse({
    ...record,
    id: persistedId(record),
    durationSeconds: nullableToUndefined(record.durationSeconds),
    sizeBytes: strapiBigIntegerToNumber(record.sizeBytes),
    mimeType: nullableToUndefined(record.mimeType),
    thumbnailUrl: nullableToUndefined(record.thumbnailUrl),
    originalKey: nullableToUndefined(record.originalKey),
    streamUrl: nullableToUndefined(record.streamUrl),
    externalUrl: nullableToUndefined(record.externalUrl),
    chapters: nullableToUndefined(record.chapters),
    subtitles: nullableToUndefined(record.subtitles),
    failureReason: nullableToUndefined(record.failureReason),
  });
}

function safeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function getVideoRecord(id: string): Promise<VideoRecord | undefined> {
  const filters = /^\d+$/.test(id)
    ? { 'filters[id][$eq]': id }
    : { 'filters[documentId][$eq]': id };
  const res = await strapiGet<VideoRecord>('/videos', {
    ...filters,
    'pagination[pageSize]': '1',
  });
  return first(res.data);
}

function ensureOwnerOrStaff(video: Video, user: AuthUser): void {
  if (video.ownerId === user.id || ['moderador', 'super_admin'].includes(user.role)) return;
  throw Object.assign(new Error('Sem permissão para gerir este vídeo'), { status: 403 });
}

async function authorizeDirectContentUpload(
  videoId: string,
  mimeType: string,
  user: AuthUser
): Promise<DirectVideoUploadAuthorization> {
  const record = await getVideoRecord(videoId);
  if (!record) throw Object.assign(new Error('Vídeo não encontrado'), { status: 404 });
  const video = toVideo(record);
  ensureOwnerOrStaff(video, user);
  if (
    video.provider !== 'r2' ||
    video.mode !== 'quick_upload' ||
    video.status !== 'pending_upload' ||
    !video.originalKey
  ) {
    throw Object.assign(new Error('Este vídeo não aceita upload de conteúdo'), { status: 409 });
  }
  if (
    mimeType !== video.mimeType ||
    !ALLOWED_MEDIA_MIME_TYPES.has(mimeType) ||
    !mimeType.startsWith('video/')
  ) {
    throw Object.assign(new Error('Tipo de vídeo não permitido pelo ecossistema.'), {
      status: 415,
    });
  }
  return { key: video.originalKey, mimeType };
}

async function storeAuthorizedContent(
  authorization: DirectVideoUploadAuthorization,
  body: Uint8Array
): Promise<void> {
  if (body.byteLength === 0) {
    throw Object.assign(new Error('O vídeo enviado está vazio.'), { status: 400 });
  }
  if (body.byteLength > VIDEO_QUICK_UPLOAD_MAX_BYTES) {
    throw Object.assign(new Error('Upload rápido de vídeo limitado a 50MB.'), { status: 413 });
  }

  const buffer = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const magicBytes = await validateMagicBytes(buffer, authorization.mimeType);
  if (!magicBytes.ok) {
    throw Object.assign(new Error(magicBytes.reason), { status: 415 });
  }
  await uploadToR2(authorization.key, buffer, authorization.mimeType);
}

async function canAccessProtected(
  video: Video,
  user: AuthUser,
  courseId?: string
): Promise<boolean> {
  if (
    video.ownerId === user.id ||
    ['comite_cientifico', 'moderador', 'super_admin'].includes(user.role)
  ) {
    return true;
  }
  if (!courseId) return false;
  const curso = await cursosService.obterCursoComModulos(courseId, 'published');
  if (!curso) return false;
  if (curso.autorId === user.id) return true;
  const hasVideo =
    curso.modulos?.some((modulo) => modulo.itens.some((item) => item.videoId === video.id)) ??
    false;
  if (!hasVideo) return false;
  const perfilId = await cursosService.resolvePerfilId(user.id, user.perfilId);
  return Boolean(await cursosService.buscarInscricao(courseId, perfilId));
}

export const videoService = {
  async createExternal(rawPayload: CreateExternalVideoPayload, user: AuthUser): Promise<Video> {
    const payload = CreateExternalVideoPayloadSchema.parse(rawPayload);
    const res = await strapiPost<VideoRecord>('/videos', {
      provider: payload.provider,
      mode: 'external',
      visibility: payload.visibility,
      status: 'ready',
      ownerId: user.id,
      title: payload.title,
      externalUrl: payload.externalUrl,
      thumbnailUrl: payload.thumbnailUrl,
      durationSeconds: payload.durationSeconds,
    });
    return toVideo(res.data);
  },

  async createR2(rawPayload: CreateR2VideoPayload, user: AuthUser): Promise<CreateR2VideoResponse> {
    const payload = CreateR2VideoPayloadSchema.parse(rawPayload);
    if (!ALLOWED_MEDIA_MIME_TYPES.has(payload.mimeType) || !payload.mimeType.startsWith('video/')) {
      throw Object.assign(new Error('Tipo de vídeo não permitido pelo ecossistema.'), {
        status: 415,
      });
    }
    if (payload.mode === 'professional_upload') {
      return videoMultipartService.create(payload, user);
    }
    if (payload.sizeBytes > VIDEO_QUICK_UPLOAD_MAX_BYTES) {
      throw Object.assign(new Error('Upload rápido de vídeo limitado a 50MB.'), { status: 413 });
    }
    const r2Configured = isR2Configured();
    if (!r2Configured && env.NODE_ENV === 'production') {
      throw Object.assign(
        new Error('Upload de vídeo indisponível: armazenamento R2 não configurado.'),
        { status: 503 }
      );
    }

    const seedId = crypto.randomUUID();
    const key = `videos/${user.id}/${seedId}-${safeFilename(payload.filename)}`;
    const uploadMethod = r2Configured ? 'presigned' : 'direct';
    const presignedUploadUrl =
      uploadMethod === 'presigned' ? await generatePresignedUrl(key, payload.mimeType) : undefined;
    const res = await strapiPost<VideoRecord>('/videos', {
      provider: 'r2',
      mode: payload.mode,
      visibility: payload.visibility,
      status: 'pending_upload',
      ownerId: user.id,
      title: payload.title,
      originalKey: key,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes,
    });
    const video = toVideo(res.data);
    return QuickR2VideoResponseSchema.parse({
      video,
      uploadUrl:
        presignedUploadUrl ?? `${env.API_URL.replace(/\/+$/, '')}/videos/${video.id}/content`,
      uploadMethod,
      key,
    });
  },

  async authorizeContentUpload(
    videoId: string,
    mimeType: string,
    user: AuthUser
  ): Promise<DirectVideoUploadAuthorization> {
    return authorizeDirectContentUpload(videoId, mimeType, user);
  },

  async uploadAuthorizedContent(
    authorization: DirectVideoUploadAuthorization,
    body: Uint8Array
  ): Promise<void> {
    await storeAuthorizedContent(authorization, body);
  },

  async uploadContent(
    videoId: string,
    body: Uint8Array,
    mimeType: string,
    user: AuthUser
  ): Promise<void> {
    const authorization = await authorizeDirectContentUpload(videoId, mimeType, user);
    await storeAuthorizedContent(authorization, body);
  },

  async confirmUpload(
    videoId: string,
    rawPayload: ConfirmVideoUploadPayload,
    user: AuthUser
  ): Promise<Video> {
    const payload = ConfirmVideoUploadPayloadSchema.parse(rawPayload);
    const record = await getVideoRecord(videoId);
    if (!record) throw Object.assign(new Error('Vídeo não encontrado'), { status: 404 });
    const video = toVideo(record);
    ensureOwnerOrStaff(video, user);
    if (
      video.provider !== 'r2' ||
      video.mode !== 'quick_upload' ||
      video.originalKey !== payload.key
    ) {
      throw Object.assign(new Error('Chave de vídeo inválida'), { status: 409 });
    }
    const publicUrl = getPublicUrl(payload.key);
    const updated = await strapiPut<VideoRecord>(`/videos/${persistedId(record)}`, {
      status: 'ready',
      streamUrl: publicUrl,
      sizeBytes: payload.sizeBytes ?? video.sizeBytes,
      durationSeconds: payload.durationSeconds ?? video.durationSeconds,
      thumbnailUrl: payload.thumbnailUrl ?? video.thumbnailUrl,
    });
    const nextVideo = toVideo(updated.data);
    await eventBus.publishWithOutbox(DomainEventName.MEDIA_UPLOADED, {
      mediaId: nextVideo.id,
      uploaderId: user.id,
      url: publicUrl,
    });
    return nextVideo;
  },

  async getPlayback(
    videoId: string,
    user: AuthUser | undefined,
    courseId?: string
  ): Promise<VideoPlaybackResponse> {
    const record = await getVideoRecord(videoId);
    if (!record) throw Object.assign(new Error('Vídeo não encontrado'), { status: 404 });
    const video = toVideo(record);
    if (video.status !== 'ready') {
      throw Object.assign(new Error('Vídeo ainda não está pronto para reprodução'), {
        status: 409,
      });
    }
    if (video.visibility !== 'public') {
      if (!user) throw Object.assign(new Error('Autenticação obrigatória'), { status: 401 });
      const allowed =
        video.visibility === 'private'
          ? video.ownerId === user.id || ['moderador', 'super_admin'].includes(user.role)
          : await canAccessProtected(video, user, courseId);
      if (!allowed)
        throw Object.assign(new Error('Sem permissão para reproduzir este vídeo'), { status: 403 });
    }

    const playbackUrl =
      video.provider === 'r2' && video.originalKey
        ? await generatePresignedReadUrl(video.originalKey, SIGNED_PLAYBACK_TTL_SECONDS)
        : (video.externalUrl ?? video.streamUrl);
    if (!playbackUrl)
      throw Object.assign(new Error('Vídeo sem URL de reprodução'), { status: 409 });

    return VideoPlaybackResponseSchema.parse({
      videoId: video.id,
      provider: video.provider,
      playbackUrl,
      expiresAt:
        video.provider === 'r2'
          ? new Date(Date.now() + SIGNED_PLAYBACK_TTL_SECONDS * 1000).toISOString()
          : undefined,
      status: video.status,
      thumbnailUrl: video.thumbnailUrl,
    });
  },
};
