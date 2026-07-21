import { z, type ZodType, type ZodTypeDef } from 'zod';
import { resolveApiBaseUrl } from './base-url';

const BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_URL,
  import.meta.env.PROD === true,
);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getErrorBody(error: unknown): { error?: string } | undefined {
  if (!(error instanceof ApiError)) return undefined;
  if (typeof error.body !== 'object' || error.body === null) return undefined;
  if (!('error' in error.body) || typeof error.body.error !== 'string') return undefined;
  return { error: error.body.error };
}

const SKIP_REFRESH_PATHS = new Set([
  '/auth/me',
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

type RefreshResult = 'refreshed' | 'invalid' | 'unavailable';
let coordinatedRefreshPromise: Promise<RefreshResult> | null = null;
const REFRESH_LOCK_NAME = 'pdc-auth-refresh';
const REFRESH_COMPLETED_AT_KEY = 'pdc:auth-refresh-completed-at';

function notifySessionExpired(): void {
  window.dispatchEvent(new Event('pdc:session-expired'));
}

function readLastRefreshCompletedAt(): number {
  try {
    const value = Number.parseInt(localStorage.getItem(REFRESH_COMPLETED_AT_KEY) ?? '', 10);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function recordRefreshCompleted(): void {
  try {
    localStorage.setItem(REFRESH_COMPLETED_AT_KEY, Date.now().toString());
  } catch {
    // Storage pode estar bloqueado; a rotação continua protegida na aba atual.
  }
}

async function performRefresh(): Promise<RefreshResult> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (response.ok) {
      recordRefreshCompleted();
      return 'refreshed';
    }
    if (response.status === 401) {
      notifySessionExpired();
      return 'invalid';
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

async function coordinateRefreshAcrossTabs(requestedAt: number): Promise<RefreshResult> {
  if (!navigator.locks) return performRefresh();
  try {
    return await navigator.locks.request(REFRESH_LOCK_NAME, async () => {
      if (readLastRefreshCompletedAt() >= requestedAt) return 'refreshed';
      return performRefresh();
    });
  } catch {
    return performRefresh();
  }
}

export function refreshSession(): Promise<RefreshResult> {
  if (!coordinatedRefreshPromise) {
    const requestedAt = Date.now();
    coordinatedRefreshPromise = coordinateRefreshAcrossTabs(requestedAt)
      .finally(() => {
        coordinatedRefreshPromise = null;
      });
  }
  return coordinatedRefreshPromise;
}

function mergeHeaders(init?: RequestInit): HeadersInit {
  const headers = new Headers(init?.headers);
  const isRawBinaryOrEncodedBody = init?.body instanceof FormData
    || init?.body instanceof Blob
    || init?.body instanceof ArrayBuffer
    || init?.body instanceof URLSearchParams;
  if (init?.body != null && !isRawBinaryOrEncodedBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

/**
 * @deprecated Fronteira legada centralizada com cast cego (CONSTITUIÇÃO §2.1).
 * Novos clientes DEVEM preferir http.getParsed/postParsed/putParsed/patchParsed/deleteParsed
 * com schema Zod para validar o shape da resposta. Esta função mantém-se apenas para
 * não quebrar os wrappers históricos de uma só vez; a migração é incremental.
 * Rastreio: procurar por http.get<|http.post<|http.put<|http.patch<|http.delete< para
 * encontrar callers por migrar. Cada caller precisa de um schema Zod em @pdc/shared.
 */
function coerceLegacyResponse<T>(data: unknown): T {
  return data as T;
}

function hasJsonContent(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').includes('application/json');
}

async function parseResponseBody(path: string, response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  if (!hasJsonContent(response)) {
    const text = await response.text();
    if (text.trim() === '') return null;
    throw new ApiError(
      response.status,
      `Resposta inválida da API: ${path}`,
      { contentType: response.headers.get('content-type') ?? '', preview: text.slice(0, 120) },
    );
  }
  const text = await response.text();
  if (text.trim() === '') return null;
  try {
    return z.unknown().parse(JSON.parse(text));
  } catch {
    throw new ApiError(
      response.status,
      `Resposta JSON inválida da API: ${path}`,
      { preview: text.slice(0, 120) },
    );
  }
}

async function requestUnknown(path: string, init?: RequestInit, retried = false): Promise<unknown> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: mergeHeaders(init),
  });

  if (response.status === 401 && !retried && !SKIP_REFRESH_PATHS.has(path)) {
    const refreshResult = await refreshSession();
    if (refreshResult === 'refreshed') {
      return requestUnknown(path, init, true);
    }
    if (refreshResult === 'unavailable') {
      throw new ApiError(503, 'Serviço de sessão temporariamente indisponível');
    }
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, `HTTP ${String(response.status)}: ${path}`, body);
  }

  return parseResponseBody(path, response);
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  return coerceLegacyResponse<T>(await requestUnknown(path, init, retried));
}

async function requestParsed<T>(
  path: string,
  schema: ZodType<T, ZodTypeDef, unknown>,
  init?: RequestInit,
): Promise<T> {
  const data = await requestUnknown(path, init);
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(0, `Resposta fora do contrato esperado: ${path}`, result.error.flatten());
  }
  return result.data;
}


export const http = {
  /** @deprecated Use http.getParsed(path, schema) para validar o contrato da resposta. */
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'GET' }),

  getParsed: <T>(path: string, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit) =>
    requestParsed(path, schema, { ...init, method: 'GET' }),

  /** @deprecated Use http.postParsed(path, body, schema) para validar o contrato da resposta. */
  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  postParsed: <T>(path: string, body: unknown, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit) =>
    requestParsed(path, schema, {
      ...init,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** @deprecated Use http.putParsed(path, body, schema) para validar o contrato da resposta. */
  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  putParsed: <T>(path: string, body: unknown, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit) =>
    requestParsed(path, schema, {
      ...init,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  /** @deprecated Use http.patchParsed(path, body, schema) para validar o contrato da resposta. */
  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  patchParsed: <T>(path: string, body: unknown, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit) =>
    requestParsed(path, schema, {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  /** @deprecated Use http.deleteParsed(path, body, schema) para validar o contrato da resposta. */
  delete: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),

  deleteParsed: <T>(path: string, body: unknown, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit) =>
    requestParsed(path, schema, {
      ...init,
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),

  /** @deprecated Use http.postFormParsed(path, body, schema) para validar o contrato da resposta. */
  postForm: <T>(path: string, body: FormData, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'POST', body }),

  postFormParsed: <T>(path: string, body: FormData, schema: ZodType<T, ZodTypeDef, unknown>, init?: RequestInit) =>
    requestParsed(path, schema, { ...init, method: 'POST', body }),
};
