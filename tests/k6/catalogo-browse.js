import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, STANDARD_THRESHOLDS } from './helpers.js';

/**
 * catalogo-browse.js — Public catalogue: cursos, simulações, explorar
 *
 * No authentication needed — public endpoints with cache headers.
 * 200 VUs sustained for 5 minutes.
 *
 * Run: k6 run tests/k6/catalogo-browse.js
 */

const catalogoDuration = new Trend('catalogo_duration', true);
const errorRate = new Rate('catalogo_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '5m', target: 200 },   // Sustain 200 VUs
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...STANDARD_THRESHOLDS,
    catalogo_duration: ['p(95)<500'],
    catalogo_errors: ['rate<0.01'],
  },
};

export default function () {
  // 1. List cursos — page 1
  const cursosRes = http.get(`${BASE_URL}/catalogo/cursos?page=1&pageSize=12`);
  catalogoDuration.add(cursosRes.timings.duration);
  const cursosOk = check(cursosRes, {
    'cursos 200': (r) => r.status === 200,
  });
  if (!cursosOk) errorRate.add(1);
  else errorRate.add(0);

  sleep(0.5);

  // 2. List simulações — page 1
  const simRes = http.get(`${BASE_URL}/catalogo/simulacoes?page=1&pageSize=12`);
  catalogoDuration.add(simRes.timings.duration);
  check(simRes, {
    'simulacoes 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. List experiências
  const expRes = http.get(`${BASE_URL}/catalogo/experiencias?page=1&pageSize=12`);
  catalogoDuration.add(expRes.timings.duration);
  check(expRes, {
    'experiencias 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 4. Paginate cursos — page 2
  const cursos2Res = http.get(`${BASE_URL}/catalogo/cursos?page=2&pageSize=12`);
  catalogoDuration.add(cursos2Res.timings.duration);
  check(cursos2Res, {
    'cursos page 2 ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.3);

  // 5. Explorar endpoint
  const explorarRes = http.get(`${BASE_URL}/catalogo/explorar?page=1&pageSize=20`);
  catalogoDuration.add(explorarRes.timings.duration);
  check(explorarRes, {
    'explorar ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.3);

  // 6. Mentores públicos
  const mentoresRes = http.get(`${BASE_URL}/catalogo/mentores?page=1&pageSize=12`);
  catalogoDuration.add(mentoresRes.timings.duration);
  check(mentoresRes, {
    'mentores ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.5);
}
