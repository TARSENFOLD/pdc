const PUBLIC_AUTH_PATHS = new Set([
  '/login',
  '/criar-conta',
  '/criar-conta/finalizar',
  '/verificar',
  '/forgot-password',
  '/auth/recuperar',
  '/reset-password',
]);

export function isPublicAuthPath(pathname: string): boolean {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return PUBLIC_AUTH_PATHS.has(normalizedPath) || normalizedPath.startsWith('/criar-conta/');
}
