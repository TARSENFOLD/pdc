/**
 * Shared helpers for k6 load test scripts.
 *
 * All scripts target staging by default (BASE_URL env var).
 * Auth uses DEV_SKIP_OTP=true test accounts — never real accounts.
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
export const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:5173';

// Test accounts — must match seeded test users
export const TEST_USERS = [
  { email: 'aluno@traycer.test', password: 'password123', role: 'aluno' },
  { email: 'mentor@traycer.test', password: 'password123', role: 'mentor' },
  { email: 'instituicao@traycer.test', password: 'password123', role: 'instituicao' },
];

/**
 * Standard thresholds for all scripts.
 */
export const STANDARD_THRESHOLDS = {
  http_req_duration: ['p(95)<500'],   // p95 < 500ms
  http_req_failed: ['rate<0.01'],     // Error rate < 1%
  http_reqs: ['rate>=100'],           // Throughput ≥ 100 req/s
};

/**
 * Common HTTP params with cookie jar enabled.
 */
export function jsonParams(jar) {
  return {
    headers: { 'Content-Type': 'application/json' },
    jar,
    redirects: 0,
  };
}

/**
 * Login a test user and return the cookie jar with auth cookies.
 * Requires DEV_SKIP_OTP=true on the target server.
 */
export function login(http, jar, user) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    {
      headers: { 'Content-Type': 'application/json' },
      jar,
      redirects: 0,
    },
  );
  return res;
}

/**
 * Refresh the access token.
 */
export function refreshToken(http, jar) {
  return http.post(`${BASE_URL}/auth/refresh`, null, {
    jar,
    redirects: 0,
  });
}

/**
 * Logout — clears cookies server-side.
 */
export function logout(http, jar) {
  return http.post(`${BASE_URL}/auth/logout`, null, {
    jar,
    redirects: 0,
  });
}
