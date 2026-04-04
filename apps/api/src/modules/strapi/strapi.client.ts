const STRAPI_URL = process.env['STRAPI_URL'] ?? 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env['STRAPI_API_TOKEN'] ?? '';

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  };
}

export async function strapiGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${STRAPI_URL}/api${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), { headers: buildHeaders() });
  if (!res.ok) {
    throw new Error(`Strapi GET ${path} falhou: ${res.status.toString()}`);
  }
  return res.json() as Promise<T>;
}

export async function strapiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) {
    throw new Error(`Strapi POST ${path} falhou: ${res.status.toString()}`);
  }
  return res.json() as Promise<T>;
}

export async function strapiPut<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify({ data: body }),
  });
  if (!res.ok) {
    throw new Error(`Strapi PUT ${path} falhou: ${res.status.toString()}`);
  }
  return res.json() as Promise<T>;
}

// Para endpoints que não usam o wrapper { data: ... } (ex: Strapi Users plugin)
export async function strapiPutRaw<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Strapi PUT ${path} falhou: ${res.status.toString()}`);
  }
  return res.json() as Promise<T>;
}
