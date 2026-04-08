import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50
    { duration: '1m', target: 200 }, // Ramp up to 200
    { duration: '5m', target: 200 }, // Stay at 200
    { duration: '1m', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

export default function () {
  const loginData = {
    email: 'test-user@example.com',
    password: 'Password123!',
  };

  // 1. Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has auth token': (r) => r.json().token !== undefined || r.headers['Set-Cookie'] !== undefined,
  });

  // Small pause to simulate user thinking
  sleep(1);

  // 2. Get Me
  const meRes = http.get(`${BASE_URL}/auth/me`);
  check(meRes, {
    'me status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 3. Refresh Token
  const refreshRes = http.post(`${BASE_URL}/auth/refresh`);
  check(refreshRes, {
    'refresh status is 200': (r) => r.status === 200,
  });

  sleep(5);
}
