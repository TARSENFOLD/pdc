import {
  CreateR2VideoResponseSchema,
  VideoMultipartAbortResponseSchema,
  VideoMultipartPartResponseSchema,
  VideoPlaybackResponseSchema,
  VideoSchema,
  VIDEO_QUICK_UPLOAD_MAX_BYTES,
  type Video,
  type VideoPlaybackResponse,
} from '@pdc/shared';
import { http } from './http';

async function uploadErrorMessage(response: Response): Promise<string> {
  if (response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
    const body: unknown = await response.json().catch(() => undefined);
    if (
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'string'
    ) {
      return body.error;
    }
  }
  return 'Falha ao enviar vídeo para o armazenamento do PDC';
}

const MULTIPART_CONCURRENCY = 3;
const MULTIPART_PART_RETRIES = 3;
const MULTIPART_PART_TIMEOUT_MS = 2 * 60 * 1000;
const MULTIPART_RETRY_BASE_MS = 150;
const MULTIPART_CLEANUP_RETRIES = 3;

interface MultipartSessionIdentity {
  video: { id: string };
  uploadId: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Falha desconhecida no upload profissional.';
}

function isTransportFailure(error: unknown): boolean {
  return error instanceof TypeError;
}

async function abortMultipartSession(
  session: MultipartSessionIdentity,
  uploadError: unknown
): Promise<void> {
  let cleanupError: unknown;
  for (let attempt = 1; attempt <= MULTIPART_CLEANUP_RETRIES; attempt += 1) {
    try {
      await http.deleteParsed(
        `/videos/${session.video.id}/multipart`,
        { uploadId: session.uploadId },
        VideoMultipartAbortResponseSchema
      );
      return;
    } catch (error) {
      cleanupError = error;
      if (attempt < MULTIPART_CLEANUP_RETRIES) await waitForRetry(attempt);
    }
  }

  throw new AggregateError(
    [uploadError, cleanupError],
    `${errorMessage(uploadError)} Não foi possível confirmar a limpeza da sessão multipart.`
  );
}

function waitForRetry(attempt: number, signal?: AbortSignal): Promise<void> {
  const jitter = Math.floor(Math.random() * MULTIPART_RETRY_BASE_MS);
  const delay = MULTIPART_RETRY_BASE_MS * 2 ** (attempt - 1) + jitter;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Upload profissional cancelado.'));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new Error('Upload profissional cancelado.'));
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delay);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function uploadMultipartPart(
  uploadUrl: string,
  body: Blob,
  cancellationSignal: AbortSignal
): Promise<string> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MULTIPART_PART_RETRIES; attempt += 1) {
    if (cancellationSignal.aborted) throw new Error('Upload profissional cancelado.');
    const attemptController = new AbortController();
    const cancelAttempt = () => {
      attemptController.abort();
    };
    cancellationSignal.addEventListener('abort', cancelAttempt, { once: true });
    const timeoutId = window.setTimeout(() => {
      attemptController.abort();
    }, MULTIPART_PART_TIMEOUT_MS);
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body,
        credentials: 'omit',
        signal: attemptController.signal,
      });
      if (!response.ok) throw new Error(await uploadErrorMessage(response));
      const etag = response.headers.get('etag');
      if (!etag) throw new Error('O armazenamento não devolveu o ETag da parte enviada.');
      return etag;
    } catch (error) {
      if (cancellationSignal.aborted) throw new Error('Upload profissional cancelado.');
      lastError =
        error instanceof Error ? error : new Error('Falha no envio de uma parte do vídeo.');
      if (attempt < MULTIPART_PART_RETRIES) await waitForRetry(attempt, cancellationSignal);
    } finally {
      window.clearTimeout(timeoutId);
      cancellationSignal.removeEventListener('abort', cancelAttempt);
    }
  }
  throw lastError ?? new Error('Falha no envio de uma parte do vídeo.');
}

export const videosApi = {
  createExternal: (body: {
    provider: 'youtube' | 'vimeo' | 'loom' | 'bunny' | 'mux' | 'cloudflare';
    visibility?: 'public' | 'protected' | 'private';
    title: string;
    externalUrl: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
  }): Promise<Video> => http.postParsed('/videos/external', body, VideoSchema),

  uploadQuickR2: async (file: File, title: string): Promise<Video> => {
    const created = await http.postParsed(
      '/videos/r2',
      {
        mode: 'quick_upload',
        visibility: 'protected',
        title,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      CreateR2VideoResponseSchema
    );

    if (created.uploadMethod === 'multipart') {
      const incompatibleError = new Error(
        'O armazenamento iniciou um fluxo incompatível com o upload rápido.'
      );
      await abortMultipartSession(created, incompatibleError);
      throw incompatibleError;
    }

    const uploadRes = await fetch(created.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
      credentials: created.uploadMethod === 'direct' ? 'include' : 'omit',
    });
    if (!uploadRes.ok) {
      throw new Error(await uploadErrorMessage(uploadRes));
    }

    return http.postParsed(
      `/videos/${created.video.id}/confirm`,
      {
        key: created.key,
        sizeBytes: file.size,
      },
      VideoSchema
    );
  },

  uploadProfessionalR2: async (
    file: File,
    title: string,
    onProgress?: (percent: number) => void
  ): Promise<Video> => {
    if (file.size <= VIDEO_QUICK_UPLOAD_MAX_BYTES) {
      throw new Error('Usa o upload rápido para vídeos de até 50 MB.');
    }
    const created = await http.postParsed(
      '/videos/r2',
      {
        mode: 'professional_upload',
        visibility: 'protected',
        title,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
      CreateR2VideoResponseSchema
    );
    if (created.uploadMethod !== 'multipart') {
      throw new Error('O armazenamento não iniciou a sessão multipart esperada.');
    }

    const completedParts: Array<{ partNumber: number; etag: string }> = [];
    let nextPart = 1;
    let completedCount = 0;
    let cancelled = false;
    const cancellationController = new AbortController();
    const uploadNext = async (): Promise<void> => {
      try {
        while (!cancelled && nextPart <= created.totalParts) {
          const partNumber = nextPart;
          nextPart += 1;
          const part = await http.postParsed(
            `/videos/${created.video.id}/multipart/parts`,
            { uploadId: created.uploadId, partNumber },
            VideoMultipartPartResponseSchema
          );
          if (cancelled) return;
          const start = (partNumber - 1) * created.partSizeBytes;
          const end = Math.min(start + created.partSizeBytes, file.size);
          const etag = await uploadMultipartPart(
            part.uploadUrl,
            file.slice(start, end),
            cancellationController.signal
          );
          if (cancelled) return;
          completedParts.push({ partNumber, etag });
          completedCount += 1;
          onProgress?.(Math.round((completedCount / created.totalParts) * 100));
        }
      } catch (error) {
        cancelled = true;
        cancellationController.abort();
        throw error;
      }
    };

    try {
      const expectedTotalParts = Math.ceil(file.size / created.partSizeBytes);
      if (created.totalParts !== expectedTotalParts) {
        throw new Error(
          'O armazenamento devolveu uma sessão multipart incompatível com o ficheiro.'
        );
      }
      await Promise.all(
        Array.from({ length: Math.min(MULTIPART_CONCURRENCY, created.totalParts) }, () =>
          uploadNext()
        )
      );
      completedParts.sort((left, right) => left.partNumber - right.partNumber);
      const completionPath = `/videos/${created.video.id}/multipart/complete`;
      const completionPayload = { uploadId: created.uploadId, parts: completedParts };
      try {
        return await http.postParsed(completionPath, completionPayload, VideoSchema);
      } catch (completionError) {
        if (!isTransportFailure(completionError)) throw completionError;
        return await http.postParsed(completionPath, completionPayload, VideoSchema);
      }
    } catch (error) {
      cancelled = true;
      cancellationController.abort();
      await abortMultipartSession(created, error);
      throw error;
    }
  },

  playback: (videoId: string, courseId?: string): Promise<VideoPlaybackResponse> => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return http.getParsed(`/videos/${videoId}/playback${query}`, VideoPlaybackResponseSchema);
  },
};
