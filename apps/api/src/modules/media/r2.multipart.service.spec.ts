import { beforeEach, describe, expect, it, vi } from 'vitest';

const s3Mock = vi.hoisted(() => ({
  send: vi.fn<(command: unknown) => Promise<unknown>>(),
}));
const envMock = vi.hoisted(() => ({
  API_URL: 'http://localhost:3001',
  R2_ACCOUNT_ID: 'account-id',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_SECRET_ACCESS_KEY: 'secret-key',
  R2_BUCKET: 'pdc-media',
  R2_PUBLIC_URL: 'https://media.example.com',
}));
const signedUrlMock = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class S3Client {
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
  CreateMultipartUploadCommand: class CreateMultipartUploadCommand {
    constructor(readonly input: unknown) {}
  },
  UploadPartCommand: class UploadPartCommand {
    constructor(readonly input: unknown) {}
  },
  CompleteMultipartUploadCommand: class CompleteMultipartUploadCommand {
    constructor(readonly input: unknown) {}
  },
  AbortMultipartUploadCommand: class AbortMultipartUploadCommand {
    constructor(readonly input: unknown) {}
  },
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: signedUrlMock }));
vi.mock('../../lib/env.js', () => ({ env: envMock }));

function commandInput(command: unknown): unknown {
  return typeof command === 'object' && command !== null && 'input' in command
    ? command.input
    : undefined;
}

describe('R2 multipart service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    s3Mock.send.mockReset();
    signedUrlMock.mockReset();
    envMock.R2_BUCKET = 'pdc-media';
  });

  it('cria, assina, ordena e conclui uma sessão no bucket configurado', async () => {
    const service = await import('./r2.service.js');
    s3Mock.send.mockResolvedValueOnce({ UploadId: 'upload-1' }).mockResolvedValueOnce({});
    signedUrlMock.mockResolvedValueOnce('https://r2.example.com/part-2');

    await expect(service.createMultipartUpload('videos/user/aula.mp4', 'video/mp4')).resolves.toBe(
      'upload-1'
    );
    await expect(
      service.generateMultipartPartUploadUrl('videos/user/aula.mp4', 'upload-1', 2)
    ).resolves.toBe('https://r2.example.com/part-2');
    await expect(
      service.completeMultipartUpload('videos/user/aula.mp4', 'upload-1', [
        { partNumber: 2, etag: 'etag-2' },
        { partNumber: 1, etag: 'etag-1' },
      ])
    ).resolves.toBeUndefined();

    expect(commandInput(s3Mock.send.mock.calls[0]?.[0])).toEqual({
      Bucket: 'pdc-media',
      Key: 'videos/user/aula.mp4',
      ContentType: 'video/mp4',
    });
    expect(commandInput(signedUrlMock.mock.calls[0]?.[1])).toEqual({
      Bucket: 'pdc-media',
      Key: 'videos/user/aula.mp4',
      UploadId: 'upload-1',
      PartNumber: 2,
    });
    expect(commandInput(s3Mock.send.mock.calls[1]?.[0])).toEqual({
      Bucket: 'pdc-media',
      Key: 'videos/user/aula.mp4',
      UploadId: 'upload-1',
      MultipartUpload: {
        Parts: [
          { ETag: 'etag-1', PartNumber: 1 },
          { ETag: 'etag-2', PartNumber: 2 },
        ],
      },
    });
  });

  it('aborta a sessão certa no objeto certo', async () => {
    const { abortMultipartUpload } = await import('./r2.service.js');
    s3Mock.send.mockResolvedValueOnce({});

    await expect(abortMultipartUpload('videos/user/aula.mp4', 'upload-1')).resolves.toBeUndefined();

    expect(commandInput(s3Mock.send.mock.calls[0]?.[0])).toEqual({
      Bucket: 'pdc-media',
      Key: 'videos/user/aula.mp4',
      UploadId: 'upload-1',
    });
  });

  it('falha fechado quando o R2 não está configurado', async () => {
    envMock.R2_BUCKET = '';
    const { createMultipartUpload } = await import('./r2.service.js');

    await expect(createMultipartUpload('videos/user/aula.mp4', 'video/mp4')).rejects.toMatchObject({
      code: 'MEDIA_STORAGE_MISCONFIGURED',
    });
    expect(s3Mock.send).not.toHaveBeenCalled();
  });

  it('rejeita uma criação sem UploadId', async () => {
    const { createMultipartUpload } = await import('./r2.service.js');
    s3Mock.send.mockResolvedValueOnce({});

    await expect(createMultipartUpload('videos/user/aula.mp4', 'video/mp4')).rejects.toMatchObject({
      code: 'MEDIA_STORAGE_UNAVAILABLE',
    });
  });

  it('normaliza falhas do S3 durante criação, conclusão e aborto', async () => {
    const service = await import('./r2.service.js');
    s3Mock.send.mockRejectedValue(new Error('R2 indisponível'));

    await expect(
      service.createMultipartUpload('videos/user/aula.mp4', 'video/mp4')
    ).rejects.toMatchObject({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
    await expect(
      service.completeMultipartUpload('videos/user/aula.mp4', 'upload-1', [
        { partNumber: 1, etag: 'etag-1' },
      ])
    ).rejects.toMatchObject({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
    await expect(
      service.abortMultipartUpload('videos/user/aula.mp4', 'upload-1')
    ).rejects.toMatchObject({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
  });

  it('normaliza falhas ao assinar uma parte', async () => {
    const { generateMultipartPartUploadUrl } = await import('./r2.service.js');
    signedUrlMock.mockRejectedValueOnce(new Error('presigner indisponível'));

    await expect(
      generateMultipartPartUploadUrl('videos/user/aula.mp4', 'upload-1', 1)
    ).rejects.toMatchObject({ code: 'MEDIA_STORAGE_UNAVAILABLE' });
  });

  it('rejeita números de parte fora do intervalo antes de assinar', async () => {
    const { generateMultipartPartUploadUrl } = await import('./r2.service.js');

    await expect(
      generateMultipartPartUploadUrl('videos/user/aula.mp4', 'upload-1', 0)
    ).rejects.toThrow('Número de parte inválido');
    await expect(
      generateMultipartPartUploadUrl('videos/user/aula.mp4', 'upload-1', 10_001)
    ).rejects.toThrow('Número de parte inválido');
    expect(signedUrlMock).not.toHaveBeenCalled();
  });

  it('rejeita conclusão vazia, fora do intervalo ou duplicada antes de chamar o R2', async () => {
    const { completeMultipartUpload } = await import('./r2.service.js');

    await expect(completeMultipartUpload('videos/user/aula.mp4', 'upload-1', [])).rejects.toThrow(
      'pelo menos uma parte'
    );
    await expect(
      completeMultipartUpload('videos/user/aula.mp4', 'upload-1', [
        { partNumber: 0, etag: 'etag-zero' },
      ])
    ).rejects.toThrow('Número de parte inválido');
    await expect(
      completeMultipartUpload('videos/user/aula.mp4', 'upload-1', [
        { partNumber: 10_001, etag: 'etag-excessivo' },
      ])
    ).rejects.toThrow('Número de parte inválido');
    await expect(
      completeMultipartUpload('videos/user/aula.mp4', 'upload-1', [
        { partNumber: 1, etag: 'etag-1' },
        { partNumber: 1, etag: 'etag-repetido' },
      ])
    ).rejects.toThrow('números de parte duplicados');
    expect(s3Mock.send).not.toHaveBeenCalled();
  });
});
