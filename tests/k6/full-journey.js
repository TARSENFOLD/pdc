import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const email = `test-${randomString(8)}@example.com`;
  const password = 'Password123!';

  // 1. Register
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify({
    email,
    password,
    name: 'Test User',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(registerRes, {
    'register status is 201': (r) => r.status === 201,
  });

  sleep(2);

  // 2. Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });

  sleep(3);

  // 3. Browse Catalogo
  http.get(`${BASE_URL}/catalogo/cursos`);
  sleep(2);

  // 4. Inscrever Curso (assumes ID 1 exists)
  const inscricaoRes = http.post(`${BASE_URL}/cursos/1/inscrever`);
  check(inscricaoRes, {
    'inscricao status is 200/201': (r) => [200, 201].includes(r.status),
  });

  sleep(2);

  // 5. Get Curso Details
  const cursoRes = http.get(`${BASE_URL}/cursos/1`);
  check(cursoRes, {
    'curso details status is 200': (r) => r.status === 200,
  });

  sleep(5);

  // 6. Post Telemetry Batch
  const telemetryRes = http.post(`${BASE_URL}/telemetria/batch`, JSON.stringify({
    events: [
      { type: 'video_progress', curso_id: 1, position: 10, timestamp: Date.now() },
      { type: 'video_progress', curso_id: 1, position: 20, timestamp: Date.now() + 1000 },
    ]
  }), { headers: { 'Content-Type': 'application/json' } });

  check(telemetryRes, {
    'telemetry status is 201': (r) => r.status === 201,
  });

  sleep(10);
}
