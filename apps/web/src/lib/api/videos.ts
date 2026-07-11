import {
  CreateR2VideoResponseSchema,
  VideoPlaybackResponseSchema,
  VideoSchema,
  type Video,
  type VideoPlaybackResponse,
} from '@pdc/shared';
import { http } from './http';

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
    const created = await http.postParsed('/videos/r2', {
      mode: 'quick_upload',
      visibility: 'protected',
      title,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    }, CreateR2VideoResponseSchema);

    const uploadRes = await fetch(created.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!uploadRes.ok) {
      throw new Error('Falha ao enviar vídeo para o storage');
    }

    return http.postParsed(`/videos/${created.video.id}/confirm`, {
      key: created.key,
      sizeBytes: file.size,
    }, VideoSchema);
  },

  playback: (videoId: string, courseId?: string): Promise<VideoPlaybackResponse> => {
    const query = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    return http.getParsed(`/videos/${videoId}/playback${query}`, VideoPlaybackResponseSchema);
  },
};
