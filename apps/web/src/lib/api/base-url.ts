export function resolveApiBaseUrl(value: unknown, isProduction: boolean): string {
  const configured = typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
  if (configured) return configured;
  return isProduction ? 'https://api.usepdc.com' : '/api';
}
