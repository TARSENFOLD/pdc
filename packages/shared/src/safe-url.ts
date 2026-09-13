export interface SafeRenderableUrlPolicy {
  allowLocalHttp?: boolean;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Returns a normalized URL only when it is safe to use in a browser navigation
 * or embedded player. Production content must use HTTPS; HTTP is accepted only
 * for explicit local-development addresses.
 */
export function safeRenderableUrl(
  value: unknown,
  policy: SafeRenderableUrlPolicy = {},
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;

  try {
    const parsed = new URL(value.trim());
    const isLocalHttp = policy.allowLocalHttp === true
      && parsed.protocol === 'http:'
      && LOCAL_HOSTNAMES.has(parsed.hostname);

    return parsed.protocol === 'https:' || isLocalHttp ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}
