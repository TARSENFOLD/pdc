import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  DeleteObjectCommand: class DeleteObjectCommand {
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

describe('r2 service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    s3Mock.config = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('limita a chamada S3 e classifica credenciais rejeitadas sem expor o provider', async () => {
    const { uploadToR2 } = await import('./r2.service.js');
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
    const { isR2Ready } = await import('./r2.service.js');
    vi.useFakeTimers();
    s3Mock.send
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } });

    await expect(isR2Ready()).resolves.toBe(false);
    await expect(isR2Ready()).resolves.toBe(false);
    expect(s3Mock.send).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_001);

    await expect(isR2Ready()).resolves.toBe(true);
    expect(s3Mock.send).toHaveBeenCalledTimes(3);
  });

  it('partilha um único probe entre chamadas concorrentes', async () => {
    const { isR2Ready } = await import('./r2.service.js');
    let completeWrite: ((value: unknown) => void) | undefined;
    s3Mock.send
      .mockImplementationOnce(() => new Promise((resolve) => { completeWrite = resolve; }))
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

    const first = isR2Ready();
    const second = isR2Ready();

    expect(s3Mock.send).toHaveBeenCalledTimes(1);
    completeWrite?.({ $metadata: { httpStatusCode: 200 } });
    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
    expect(s3Mock.send).toHaveBeenCalledTimes(2);
  });

  it('não degrada a readiness global por uma rejeição isolada de input', async () => {
    const { isR2Ready, uploadToR2 } = await import('./r2.service.js');
    s3Mock.send
      .mockRejectedValueOnce(Object.assign(new Error('Bad Request'), {
        $metadata: { httpStatusCode: 400 },
      }))
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

    await expect(uploadToR2('uploads/user/avatar.jpg', Buffer.from('image'), 'image/jpeg'))
      .rejects.toMatchObject({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
    await expect(isR2Ready()).resolves.toBe(true);
    expect(s3Mock.send).toHaveBeenCalledTimes(3);
  });

  it('invalida readiness após throttling e força novo probe', async () => {
    const { isR2Ready, uploadToR2 } = await import('./r2.service.js');
    vi.useFakeTimers();
    s3Mock.send
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } })
      .mockRejectedValueOnce(Object.assign(new Error('Too Many Requests'), {
        $metadata: { httpStatusCode: 429 },
      }))
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })
      .mockResolvedValueOnce({ $metadata: { httpStatusCode: 204 } });

    await expect(isR2Ready()).resolves.toBe(true);
    await expect(uploadToR2('uploads/user/avatar.jpg', Buffer.from('image'), 'image/jpeg'))
      .rejects.toMatchObject({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
    await expect(isR2Ready()).resolves.toBe(false);

    await vi.advanceTimersByTimeAsync(3_001);

    await expect(isR2Ready()).resolves.toBe(true);
    expect(s3Mock.send).toHaveBeenCalledTimes(5);
  });
});
