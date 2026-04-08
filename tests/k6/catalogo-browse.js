import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 200,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<300'], // Public endpoints should be faster
  },
};

export default function () {
  // 1. Browse Courses
  const cursosRes = http.get(`${BASE_URL}/catalogo/cursos`);
  check(cursosRes, {
    'cursos status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 2. Browse Simulations
  const simulacoesRes = http.get(`${BASE_URL}/catalogo/simulacoes`);
  check(simulacoesRes, {
    'simulacoes status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 3. Explore
  const explorarRes = http.get(`${BASE_URL}/catalogo/explorar`);
  check(explorarRes, {
    'explorar status is 200': (r) => r.status === 200,
  });

  sleep(5);
}
