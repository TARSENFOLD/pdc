export const ACCESS_TOKEN_TTL = '15m';
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;

// Browsers cap persistent cookies at roughly 400 days. Rotation on use makes
// the session effectively continuous while preserving revocation and logout.
export const REFRESH_TOKEN_TTL = '400d';
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
