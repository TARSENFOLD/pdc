import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 50,
  duration: '30m', // Long duration to find leaks
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const loginData = {
    email: 'test-user@example.com',
    password: 'Password123!',
  };

  // 1. Auth (every iteration simulates a new session login)
  http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });

  // 2. Feed Page 1
  const feedRes = http.get(`${BASE_URL}/feed?tab=para-ti&page=1`);
  check(feedRes, { 'feed status is 200': (r) => r.status === 200 });

  sleep(5);

  // 3. Browse Catalogo
  const cursosRes = http.get(`${BASE_URL}/catalogo/cursos`);
  check(cursosRes, { 'cursos status is 200': (r) => r.status === 200 });

  sleep(10);
}
