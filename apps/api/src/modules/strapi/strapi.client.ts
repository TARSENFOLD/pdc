import pino from 'pino';
import { env } from '../../lib/env.js';
import { type StrapiListResponse, type StrapiSingleResponse } from '@pdc/shared';

const log = pino({ name: 'strapi-client' });

const STRAPI_URL = env.STRAPI_URL;
const STRAPI_API_TOKEN = env.STRAPI_API_TOKEN;

function parseTimeoutEnv(envKey: 'STRAPI_TIMEOUT' | 'STRAPI_WRITE_TIMEOUT', defaultMs: number): number {
  const raw = env[envKey];
  if (raw === undefined || raw.trim() === '') return defaultMs;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed <= 0) {
    log.warn({ envKey, raw, fallback: defaultMs }, 'Invalid timeout env var — using default');
    return defaultMs;
  }
  return parsed;
}

const TIMEOUT = parseTimeoutEnv('STRAPI_TIMEOUT', 5000);
const WRITE_TIMEOUT = parseTimeoutEnv('STRAPI_WRITE_TIMEOUT', 10000);
const MAX_RETRIES = 1;
const BASE_DELAY = 300;

export class StrapiHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
  ) {
    super(message);
    this.name = 'StrapiHttpError';
  }
}

/**
 * Normalise Strapi v4 (nested `attributes`) responses to flat format.
 * If already flat (v5), returns unchanged. Preserves `meta` for pagination.
 */
export function normalizeStrapiResponse<T>(response: T): T {
  if (response == null || typeof response !== 'object') return response;

  const res = response as unknown as Record<string, unknown>;
  const data = res['data'];

  if (data == null) return response;

  if (Array.isArray(data)) {
    res['data'] = data.map((item: unknown) => {
      if (typeof item === 'object' && item !== null && 'attributes' in item) {
        const entry = item as Record<string, unknown> & { attributes: Record<string, unknown> };
        const { attributes, ...identity } = entry;
        return {
          ...identity,
          ...attributes,
        };
      }
      return item;
    });
  } else if (typeof data === 'object' && 'attributes' in data) {
    const entry = data as Record<string, unknown> & { attributes: Record<string, unknown> };
    const { attributes, ...identity } = entry;
    res['data'] = { ...identity, ...attributes };
  }

  return response;
}

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => { controller.abort(); }, timeout);
  const response = await fetch(url, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

async function fetchWithRetry(url: string, options: RequestInit = {}, timeout = TIMEOUT): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchWithTimeout(url, options, timeout);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        await new Promise(r => { setTimeout(r, delay); });
        log.warn({ attempt: attempt + 1, maxRetries: MAX_RETRIES, url }, 'Strapi retry');
      }
    }
  }
  throw lastError;
}

export async function strapiGet<T>(
  path: string,
  params?: Record<string, string | string[]>
): Promise<StrapiListResponse<T>> {
  const url = new URL(`${STRAPI_URL}/api${path}`);
  if (params) {
    for (const [k, originalValue] of Object.entries(params)) {
      let v = originalValue;
      // Auto-convert comma-separated populate to array for Strapi v5
      if (k === 'populate' && typeof v === 'string' && v.includes(',')) {
        v = v.split(',').map(s => s.trim());
      }

      if (Array.isArray(v)) {
        v.forEach((val, i) => {
          url.searchParams.append(`${k}[${String(i)}]`, val);
        });
      } else {
        url.searchParams.set(k, v);
      }
    }
  }
  log.info({ url: url.toString() }, `Strapi GET ${path}`);
  const res = await fetchWithRetry(url.toString(), { headers: buildHeaders() }, TIMEOUT);
  if (!res.ok) {
    log.error({ url: url.toString(), status: res.status }, `Strapi GET ${path} falhou`);
    throw new StrapiHttpError(`Strapi GET ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  const json = (await res.json()) as StrapiListResponse<T>;
  return normalizeStrapiResponse(json);
}

export async function strapiPost<T>(path: string, body: unknown): Promise<StrapiSingleResponse<T>> {
  const res = await fetchWithRetry(`${STRAPI_URL}/api${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ data: body }),
  }, WRITE_TIMEOUT);
  if (!res.ok) {
    throw new StrapiHttpError(`Strapi POST ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  const json = (await res.json()) as StrapiSingleResponse<T>;
  return normalizeStrapiResponse(json);
}

export async function strapiPut<T>(path: string, body: unknown): Promise<StrapiSingleResponse<T>> {
  const res = await fetchWithRetry(`${STRAPI_URL}/api${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ data: body }),
  }, WRITE_TIMEOUT);
  if (!res.ok) {
    throw new StrapiHttpError(`Strapi PUT ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  const json = (await res.json()) as StrapiSingleResponse<T>;
  return normalizeStrapiResponse(json);
}

export async function strapiDelete<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(`${STRAPI_URL}/api${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }, WRITE_TIMEOUT);
  if (!res.ok) {
    throw new StrapiHttpError(`Strapi DELETE ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  const json = (await res.json()) as T;
  return normalizeStrapiResponse(json);
}

// Para endpoints que não usam o wrapper { data: ... } (ex: Strapi Users plugin)
export async function strapiPutRaw<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${STRAPI_URL}/api${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  }, WRITE_TIMEOUT);
  if (!res.ok) {
    throw new StrapiHttpError(`Strapi PUT ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  return res.json() as Promise<T>;
}

export async function strapiPostRaw<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithRetry(`${STRAPI_URL}/api${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  }, WRITE_TIMEOUT);
  if (!res.ok) {
    throw new StrapiHttpError(`Strapi POST ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  return res.json() as Promise<T>;
}

export async function strapiGetRaw<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${STRAPI_URL}/api${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetchWithRetry(url.toString(), { headers: buildHeaders() }, TIMEOUT);
  if (!res.ok) {
    throw new StrapiHttpError(`Strapi GET ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  return res.json() as Promise<T>;
}

export async function strapiDeleteRaw<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(`${STRAPI_URL}/api${path}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  }, WRITE_TIMEOUT);
  if (!res.ok) {
    throw new StrapiHttpError(`Strapi DELETE ${path} falhou: ${res.status.toString()}`, res.status, path);
  }
  return res.json() as Promise<T>;
}
