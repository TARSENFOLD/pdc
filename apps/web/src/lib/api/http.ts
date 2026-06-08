const configuredBaseUrl = import.meta.env.VITE_API_URL as string | undefined;
const BASE_URL: string = configuredBaseUrl
  ?? (import.meta.env.PROD ? 'https://api.usepdc.com' : '/api');

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
  const body = error.body as Record<string, unknown>;
  return typeof body['error'] === 'string' ? { error: body['error'] } : undefined;
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

let refreshPromise: Promise<boolean> | null = null;

function notifySessionExpired(): void {
  window.dispatchEvent(new Event('pdc:session-expired'));
}

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => {
        if (!response.ok) notifySessionExpired();
        return response.ok;
      })
      .catch(() => false)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (response.status === 401 && !retried && !SKIP_REFRESH_PATHS.has(path)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, init, true);
    }
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, `HTTP ${String(response.status)}: ${path}`, body);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      response.status,
      `Resposta inválida da API: ${path}`,
      { contentType },
    );
  }

  const data = await response.json() as unknown;
  return data as T;
}

export const http = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'GET' }),

  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: 'DELETE' }),
};
