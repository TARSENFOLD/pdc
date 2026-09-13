import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const httpMock = vi.hoisted(() => ({
  postParsed: vi.fn(),
  deleteParsed: vi.fn(),
}));

vi.mock('./http', () => ({ http: httpMock }));

function professionalSession() {
  return {
    video: {
      id: 'video-professional',
      provider: 'r2',
      mode: 'professional_upload',
      visibility: 'protected',
      status: 'pending_upload',
      ownerId: 'institution-1',
      title: 'Aula longa',
    },
    uploadMethod: 'multipart',
    key: 'videos/institution-1/aula.mp4',
    uploadId: 'upload-1',
    partSizeBytes: 30 * 1024 * 1024,
    totalParts: 2,
  };
}

function largeFile(): File {
  const file = new File(['video'], 'aula.mp4', { type: 'video/mp4' });
  Object.defineProperty(file, 'size', { value: 60 * 1024 * 1024 });
  return file;
}

function quickSession() {
  return {
    video: {
      id: 'video-quick',
      provider: 'r2',
      mode: 'quick_upload',
      visibility: 'protected',
      status: 'pending_upload',
      ownerId: 'mentor-1',
      title: 'Aula curta',
    },
    uploadMethod: 'direct',
    uploadUrl: 'http://localhost:3001/videos/video-quick/content',
    key: 'videos/mentor-1/aula-curta.mp4',
  };
}

describe('videosApi quick upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejeita uma sessão multipart incompatível antes de enviar bytes', async () => {
    httpMock.postParsed.mockResolvedValueOnce(professionalSession());
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { videosApi } = await import('./videos');

    await expect(
      videosApi.uploadQuickR2(new File(['video'], 'aula.mp4', { type: 'video/mp4' }), 'Aula curta')
    ).rejects.toThrow('fluxo incompatível');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(httpMock.deleteParsed).toHaveBeenCalledWith(
      '/videos/video-professional/multipart',
      { uploadId: 'upload-1' },
      expect.anything()
    );
  });

  it('propaga a mensagem semântica devolvida pelo upload direto', async () => {
    httpMock.postParsed.mockResolvedValueOnce(quickSession());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Armazenamento temporariamente indisponível.' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    const { videosApi } = await import('./videos');

    await expect(
      videosApi.uploadQuickR2(new File(['video'], 'aula.mp4', { type: 'video/mp4' }), 'Aula curta')
    ).rejects.toThrow('Armazenamento temporariamente indisponível.');
  });

  it('preserva JSON mesmo quando o servidor usa capitalização diferente no media type', async () => {
    httpMock.postParsed.mockResolvedValueOnce(quickSession());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Limite institucional excedido.' }), {
          status: 413,
          headers: { 'Content-Type': 'Application/JSON; Charset=UTF-8' },
        })
      )
    );
    const { videosApi } = await import('./videos');

    await expect(
      videosApi.uploadQuickR2(new File(['video'], 'aula.mp4', { type: 'video/mp4' }), 'Aula curta')
    ).rejects.toThrow('Limite institucional excedido.');
  });

  it('usa a mensagem segura quando o upload direto falha sem JSON', async () => {
    httpMock.postParsed.mockResolvedValueOnce(quickSession());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('gateway indisponível', {
          status: 502,
          headers: { 'Content-Type': 'text/plain' },
        })
      )
    );
    const { videosApi } = await import('./videos');

    await expect(
      videosApi.uploadQuickR2(new File(['video'], 'aula.mp4', { type: 'video/mp4' }), 'Aula curta')
    ).rejects.toThrow('Falha ao enviar vídeo para o armazenamento do PDC');
  });
});

describe('videosApi professional upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('recusa ficheiros pequenos antes de abrir uma sessão multipart', async () => {
    const { videosApi } = await import('./videos');

    await expect(
      videosApi.uploadProfessionalR2(
        new File(['video'], 'aula-curta.mp4', { type: 'video/mp4' }),
        'Aula curta'
      )
    ).rejects.toThrow('upload rápido');

    expect(httpMock.postParsed).not.toHaveBeenCalled();
  });

  it('uploads independent parts, reports progress and completes the session', async () => {
    httpMock.postParsed
      .mockResolvedValueOnce(professionalSession())
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-1', partNumber: 1 })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-2', partNumber: 2 })
      .mockResolvedValueOnce({
        ...professionalSession().video,
        status: 'ready',
      });
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return Promise.resolve(
        new Response(null, {
          status: 200,
          headers: { etag: requestUrl.endsWith('part-1') ? 'etag-1' : 'etag-2' },
        })
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const progress: number[] = [];
    const { videosApi } = await import('./videos');

    const video = await videosApi.uploadProfessionalR2(largeFile(), 'Aula longa', (value) => {
      progress.push(value);
    });

    expect(video.status).toBe('ready');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(progress.sort((left, right) => left - right)).toEqual([50, 100]);
    expect(httpMock.postParsed).toHaveBeenLastCalledWith(
      '/videos/video-professional/multipart/complete',
      {
        uploadId: 'upload-1',
        parts: [
          { partNumber: 1, etag: 'etag-1' },
          { partNumber: 2, etag: 'etag-2' },
        ],
      },
      expect.anything()
    );
  });

  it('retries a failed part and aborts the multipart session after the final failure', async () => {
    httpMock.postParsed
      .mockResolvedValueOnce({
        ...professionalSession(),
        partSizeBytes: 60 * 1024 * 1024,
        totalParts: 1,
      })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-1', partNumber: 1 });
    httpMock.deleteParsed.mockResolvedValueOnce(null);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('rede indisponível')));
    const { videosApi } = await import('./videos');

    await expect(videosApi.uploadProfessionalR2(largeFile(), 'Aula longa')).rejects.toThrow(
      'rede indisponível'
    );

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(httpMock.deleteParsed).toHaveBeenCalledWith(
      '/videos/video-professional/multipart',
      { uploadId: 'upload-1' },
      expect.anything()
    );
  });

  it('repete a conclusão e limpa a sessão preservando o erro original', async () => {
    const completionError = new TypeError('conclusão temporariamente indisponível');
    httpMock.postParsed
      .mockResolvedValueOnce(professionalSession())
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-1', partNumber: 1 })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-2', partNumber: 2 })
      .mockRejectedValueOnce(completionError)
      .mockRejectedValueOnce(completionError);
    httpMock.deleteParsed.mockResolvedValueOnce(null);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 200, headers: { etag: 'etag-part' } }))
    );
    const { videosApi } = await import('./videos');

    await expect(videosApi.uploadProfessionalR2(largeFile(), 'Aula longa')).rejects.toThrow(
      'conclusão temporariamente indisponível'
    );

    expect(httpMock.postParsed).toHaveBeenCalledTimes(5);
    expect(httpMock.deleteParsed).toHaveBeenCalledWith(
      '/videos/video-professional/multipart',
      { uploadId: 'upload-1' },
      expect.anything()
    );
  });

  it('expõe falha de reconciliação quando a sessão não pode ser limpa', async () => {
    httpMock.postParsed
      .mockResolvedValueOnce({
        ...professionalSession(),
        partSizeBytes: 60 * 1024 * 1024,
        totalParts: 1,
      })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-1', partNumber: 1 });
    httpMock.deleteParsed.mockRejectedValue(new Error('limpeza indisponível'));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upload interrompido')));
    const { videosApi } = await import('./videos');

    await expect(videosApi.uploadProfessionalR2(largeFile(), 'Aula longa')).rejects.toThrow(
      'upload interrompido Não foi possível confirmar a limpeza da sessão multipart.'
    );

    expect(httpMock.deleteParsed).toHaveBeenCalledTimes(3);
  });

  it('rejeita uma sessão incompatível antes de enviar qualquer parte', async () => {
    httpMock.postParsed.mockResolvedValueOnce({
      video: {
        ...professionalSession().video,
        mode: 'quick_upload',
      },
      uploadMethod: 'direct',
      uploadUrl: 'http://localhost:3001/videos/video-professional/content',
      key: 'videos/institution-1/aula.mp4',
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { videosApi } = await import('./videos');

    await expect(videosApi.uploadProfessionalR2(largeFile(), 'Aula longa')).rejects.toThrow(
      'sessão multipart esperada'
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(httpMock.deleteParsed).not.toHaveBeenCalled();
  });

  it('repete uma parte sem ETag e aborta a sessão após a última tentativa', async () => {
    httpMock.postParsed
      .mockResolvedValueOnce({
        ...professionalSession(),
        partSizeBytes: 60 * 1024 * 1024,
        totalParts: 1,
      })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-1', partNumber: 1 });
    httpMock.deleteParsed.mockResolvedValueOnce(null);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const { videosApi } = await import('./videos');

    await expect(videosApi.uploadProfessionalR2(largeFile(), 'Aula longa')).rejects.toThrow('ETag');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(httpMock.deleteParsed).toHaveBeenCalledWith(
      '/videos/video-professional/multipart',
      { uploadId: 'upload-1' },
      expect.anything()
    );
  });

  it('cancels the remaining workers before they request more parts', async () => {
    httpMock.postParsed
      .mockResolvedValueOnce({
        ...professionalSession(),
        partSizeBytes: 10 * 1024 * 1024,
        totalParts: 6,
      })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-1', partNumber: 1 })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-2', partNumber: 2 })
      .mockResolvedValueOnce({ uploadUrl: 'https://r2.example.com/part-3', partNumber: 3 });
    httpMock.deleteParsed.mockResolvedValueOnce(null);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ligação interrompida')));
    const { videosApi } = await import('./videos');

    await expect(videosApi.uploadProfessionalR2(largeFile(), 'Aula longa')).rejects.toThrow();

    expect(httpMock.postParsed).toHaveBeenCalledTimes(4);
    expect(httpMock.deleteParsed).toHaveBeenCalledOnce();
  });

  it('aborta uma sessão cujo número de partes não corresponde ao ficheiro', async () => {
    httpMock.postParsed.mockResolvedValueOnce({ ...professionalSession(), totalParts: 3 });
    httpMock.deleteParsed.mockResolvedValueOnce(null);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { videosApi } = await import('./videos');

    await expect(videosApi.uploadProfessionalR2(largeFile(), 'Aula longa')).rejects.toThrow(
      'sessão multipart incompatível'
    );

    expect(httpMock.postParsed).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(httpMock.deleteParsed).toHaveBeenCalledWith(
      '/videos/video-professional/multipart',
      { uploadId: 'upload-1' },
      expect.anything()
    );
  });
});
