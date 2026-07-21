const useLongE2EAuth = (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development')
  && process.env.PDC_E2E_LONG_AUTH === 'true';

export const ACCESS_TOKEN_TTL = useLongE2EAuth ? '2h' : '15m';
export const ACCESS_TOKEN_MAX_AGE_SECONDS = useLongE2EAuth ? 2 * 60 * 60 : 15 * 60;
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

export const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60;
export const TRUSTED_DEVICE_TTL_SECONDS = 90 * 24 * 60 * 60;
export const AUTH_REVOCATION_BATCH_SIZE = 50;
export const REFRESH_ROTATION_REPLAY_TTL_SECONDS = 30;
export const AUTH_RESET_LOCK_TTL_SECONDS = 5 * 60;
