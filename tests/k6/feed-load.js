import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const loginData = {
    email: 'test-user@example.com',
    password: 'Password123!',
  };

  // 1. Initial Login
  http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });

  // 2. Feed - Page 1
  const p1Res = http.get(`${BASE_URL}/feed?tab=para-ti&page=1`);
  check(p1Res, {
    'p1 status is 200': (r) => r.status === 200,
  });

  // Simulate scroll
  sleep(2);

  // 3. Feed - Page 2
  const p2Res = http.get(`${BASE_URL}/feed?tab=para-ti&page=2`);
  check(p2Res, {
    'p2 status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 4. Feed - Page 3
  const p3Res = http.get(`${BASE_URL}/feed?tab=para-ti&page=3`);
  check(p3Res, {
    'p3 status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 5. Feed - Page 4
  const p4Res = http.get(`${BASE_URL}/feed?tab=para-ti&page=4`);
  check(p4Res, {
    'p4 status is 200': (r) => r.status === 200,
  });

  sleep(5);
}
