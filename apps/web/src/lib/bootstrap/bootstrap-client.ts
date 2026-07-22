import { BootstrapResponseSchema, type BootstrapResponse } from '@pdc/shared';
import { SESSION_SERVICE_UNAVAILABLE_MESSAGE } from '@/lib/api/auth-errors';
import { ApiError, http } from '@/lib/api/http';
import { isPublicAuthPath } from './public-auth-path';

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  const bootstrap = await http.getParsed('/bootstrap', BootstrapResponseSchema);
  if (bootstrap.session.isAuthenticated) return bootstrap;

  if (bootstrap.session.status === 'unknown') {
    if (window.location.pathname.startsWith('/app')) {
      throw new ApiError(503, SESSION_SERVICE_UNAVAILABLE_MESSAGE);
    }
    return bootstrap;
  }

  if (isPublicAuthPath(window.location.pathname)) return bootstrap;

  try {
    await http.post<{ success: boolean }>('/auth/refresh', {});
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return bootstrap;
    throw error;
  }

  const refreshedBootstrap = await http.getParsed('/bootstrap', BootstrapResponseSchema);
  if (
    refreshedBootstrap.session.status === 'unknown'
    && window.location.pathname.startsWith('/app')
  ) {
    throw new ApiError(503, SESSION_SERVICE_UNAVAILABLE_MESSAGE);
  }
  return refreshedBootstrap;
}
