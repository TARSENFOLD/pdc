import { describe, expect, it } from 'vitest';
import {
  CreateExternalVideoPayloadSchema,
  CreateR2VideoPayloadSchema,
  VideoPlaybackResponseSchema,
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
});
