import { beforeEach, describe, expect, it, vi } from 'vitest';

const s3Mock = vi.hoisted(() => ({
  config: undefined as unknown,
  send: vi.fn<(command: unknown) => Promise<unknown>>(),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class S3Client {
    constructor(config: unknown) {
      s3Mock.config = config;
    }

    send(command: unknown): Promise<unknown> {
      return s3Mock.send(command);
    }
  },
  GetObjectCommand: class GetObjectCommand {
    constructor(readonly input: unknown) {}
  },
  HeadBucketCommand: class HeadBucketCommand {
    constructor(readonly input: unknown) {}
  },
  PutObjectCommand: class PutObjectCommand {
    constructor(readonly input: unknown) {}
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock('../../lib/env.js', () => ({
  env: {
    API_URL: 'http://localhost:3001',
    R2_ACCOUNT_ID: 'account-id',
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key',
    R2_BUCKET: 'pdc-media',
    R2_PUBLIC_URL: 'https://media.example.com',
  },
}));

const { isR2Ready, uploadToR2 } = await import('./r2.service.js');

describe('r2 service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    s3Mock.config = undefined;
  });

  it('limita a chamada S3 e classifica credenciais rejeitadas sem expor o provider', async () => {
    s3Mock.send.mockRejectedValueOnce(Object.assign(new Error('Unauthorized'), {
      $metadata: { httpStatusCode: 401 },
    }));

    const result = uploadToR2('uploads/user/avatar.jpg', Buffer.from('image'), 'image/jpeg');

    await expect(result).rejects.toMatchObject({
      name: 'MediaStorageError',
      code: 'MEDIA_STORAGE_MISCONFIGURED',
      message: 'Serviço de armazenamento temporariamente indisponível',
    });
    expect(s3Mock.config).toMatchObject({
      maxAttempts: 2,
      requestHandler: {
        connectionTimeout: 2_000,
        requestTimeout: 5_000,
      },
    });
  });

  it('volta a testar rapidamente depois de um probe falhado', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 4_000);
    s3Mock.send
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

    await expect(isR2Ready()).resolves.toBe(false);
    await expect(isR2Ready()).resolves.toBe(false);
    expect(s3Mock.send).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_001);

    await expect(isR2Ready()).resolves.toBe(true);
    expect(s3Mock.send).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
