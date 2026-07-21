import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, http, refreshSession } from './http';

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('http client', () => {
  it('getParsed valida resposta com schema Zod', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, count: 2 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    const data = await http.getParsed('/health', z.object({ ok: z.boolean(), count: z.number() }));

    expect(data).toEqual({ ok: true, count: 2 });
    const fetchMock = vi.mocked(fetch);
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
  });

  it('faz refresh e repete request uma vez após 401 fora das rotas auth', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired' }), { status: 401, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await http.getParsed('/dashboard/estudante', z.object({ ok: z.boolean() }));

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenNthCalledWith(2, expect.stringContaining('/auth/refresh'), expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, expect.stringContaining('/dashboard/estudante'), expect.objectContaining({ method: 'GET' }));
  });

  it('não converte indisponibilidade do refresh em sessão expirada', async () => {
    const sessionExpired = vi.fn();
    window.addEventListener('pdc:session-expired', sessionExpired, { once: true });
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unavailable' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      })));

    await expect(http.getParsed('/dashboard/estudante', z.object({ ok: z.boolean() })))
      .rejects.toMatchObject({ status: 503 });
    expect(sessionExpired).not.toHaveBeenCalled();
    window.removeEventListener('pdc:session-expired', sessionExpired);
  });

  it('emite sessão expirada uma única vez para pedidos protegidos concorrentes', async () => {
    const sessionExpired = vi.fn();
    let refreshRequests = 0;
    window.addEventListener('pdc:session-expired', sessionExpired);
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
      if (url.includes('/auth/refresh')) {
        refreshRequests += 1;
        return new Response(JSON.stringify({ error: 'invalid' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'expired' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const schema = z.object({ ok: z.boolean() });
      const results = await Promise.allSettled([
        http.getParsed('/dashboard/estudante', schema),
        http.getParsed('/perfil/me', schema),
      ]);

      expect(results).toHaveLength(2);
      for (const result of results) {
        expect(result.status).toBe('rejected');
        if (result.status === 'rejected') {
          expect(result.reason).toMatchObject({ status: 401 });
        }
      }
      expect(refreshRequests).toBe(1);
      expect(sessionExpired).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('pdc:session-expired', sessionExpired);
    }
  });

  it('deduplica refreshes concorrentes na mesma aba', async () => {
    let dashboardRequests = 0;
    let refreshRequests = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
      if (url.includes('/auth/refresh')) {
        refreshRequests += 1;
        await Promise.resolve();
        return createJsonResponse({ success: true });
      }
      dashboardRequests += 1;
      return dashboardRequests <= 2
        ? new Response(JSON.stringify({ error: 'expired' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          })
        : createJsonResponse({ ok: true });
    });
    vi.stubGlobal('fetch', fetchMock);

    const schema = z.object({ ok: z.boolean() });
    const [first, second] = await Promise.all([
      http.getParsed('/dashboard/estudante', schema),
      http.getParsed('/dashboard/estudante', schema),
    ]);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(refreshRequests).toBe(1);
  });

  it('reutiliza o refresh concluído noutra aba enquanto aguardava o Web Lock', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', {
      locks: {
        request: vi.fn(async (_name: string, callback: () => Promise<unknown>) => {
          localStorage.setItem('pdc:auth-refresh-completed-at', String(Date.now() + 1_000));
          return callback();
        }),
      },
    });

    await expect(refreshSession()).resolves.toBe('refreshed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('faz refresh direto quando a Web Locks API falha', async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ success: true }));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('navigator', {
      locks: {
        request: vi.fn().mockRejectedValue(new Error('Lock manager unavailable')),
      },
    });

    await expect(refreshSession()).resolves.toBe('refreshed');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getParsed rejeita resposta fora do contrato', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: 'yes' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    ));

    await expect(http.getParsed('/health', z.object({ ok: z.boolean() }))).rejects.toThrow();
  });

  it('aceita resposta 204 sem corpo para clientes legados', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 204 }),
    ));

    await expect(http.delete<null>('/sessions/current')).resolves.toBeNull();
  });

  it('serializa body JSON em DELETE quando recebe payload explícito', async () => {
    let capturedInit: RequestInit | undefined;
    const fetchMock: typeof fetch = (_input, init) => {
      capturedInit = init;
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    };
    vi.stubGlobal('fetch', fetchMock);

    await expect(http.delete<{ ok: true }>('/notificacoes/push/unregister', { token: 'endpoint-1' })).resolves.toEqual({ ok: true });
    expect(capturedInit).toEqual(expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ token: 'endpoint-1' }),
    }));
    expect(new Headers(capturedInit?.headers).get('Content-Type')).toBe('application/json');
  });

  it('rejeita content-type não JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } }),
    ));

    await expect(http.getParsed('/health', z.object({ ok: z.boolean() }))).rejects.toBeInstanceOf(ApiError);
  });

  const createJsonResponse = (body: unknown) => new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

  it('postParsed valida resposta com schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ id: '1' })));

    const result = await http.postParsed('/test', { name: 'x' }, z.object({ id: z.string() }));

    expect(result).toEqual({ id: '1' });
  });

  it('putParsed valida resposta com schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ updated: true })));

    const result = await http.putParsed('/test', { name: 'x' }, z.object({ updated: z.boolean() }));

    expect(result).toEqual({ updated: true });
  });

  it('patchParsed valida resposta com schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ patched: true })));

    const result = await http.patchParsed('/test', { name: 'x' }, z.object({ patched: z.boolean() }));

    expect(result).toEqual({ patched: true });
  });

  it('deleteParsed valida resposta com schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ deleted: true })));

    const result = await http.deleteParsed('/test', { id: '1' }, z.object({ deleted: z.boolean() }));

    expect(result).toEqual({ deleted: true });
  });

  it('postFormParsed valida resposta com schema', async () => {
    const form = new FormData();
    form.append('file', 'x');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse({ uploaded: true }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await http.postFormParsed('/test', form, z.object({ uploaded: z.boolean() }));

    expect(result).toEqual({ uploaded: true });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has('Content-Type')).toBe(false);
  });
});
