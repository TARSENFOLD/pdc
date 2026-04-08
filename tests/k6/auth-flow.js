import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, STANDARD_THRESHOLDS, TEST_USERS, login, refreshToken, logout } from './helpers.js';

/**
 * auth-flow.js — Login → Refresh Token → Logout
 *
 * Validates the full auth lifecycle under load.
 * Ramps from 50 to 200 VUs over 5 minutes sustained.
 *
 * Run: k6 run tests/k6/auth-flow.js
 */

const loginDuration = new Trend('login_duration', true);
const refreshDuration = new Trend('refresh_duration', true);
const errorRate = new Rate('auth_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 VUs
    { duration: '1m', target: 100 },    // Ramp to 100
    { duration: '1m', target: 200 },    // Ramp to 200
    { duration: '5m', target: 200 },    // Sustain 200 VUs
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    ...STANDARD_THRESHOLDS,
    login_duration: ['p(95)<500'],
    refresh_duration: ['p(95)<300'],
    auth_errors: ['rate<0.01'],
  },
};

export default function () {
  const jar = http.cookieJar();
  const user = TEST_USERS[__VU % TEST_USERS.length];

  // 1. Login
  const loginRes = login(http, jar, user);
  loginDuration.add(loginRes.timings.duration);

  const loginOk = check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has body': (r) => r.body && r.body.length > 0,
  });
  if (!loginOk) {
    errorRate.add(1);
    return;
  }
  errorRate.add(0);

  sleep(1);

  // 2. Refresh token
  const refreshRes = refreshToken(http, jar);
  refreshDuration.add(refreshRes.timings.duration);

  check(refreshRes, {
    'refresh status 200': (r) => r.status === 200,
  });

  sleep(1);

  // 3. Get current user
  const meRes = http.get(`${BASE_URL}/auth/me`, { jar, redirects: 0 });
  check(meRes, {
    'me status 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 4. Logout
  const logoutRes = logout(http, jar);
  check(logoutRes, {
    'logout status 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
