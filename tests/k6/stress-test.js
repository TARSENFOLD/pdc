import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, TEST_USERS, login } from './helpers.js';

/**
 * stress-test.js — Ramp to 500 VUs to find the breaking point
 *
 * Mixed workload: auth + catálogo + feed at increasing concurrency.
 * Identifies the VU count where p95 > 1s or errors > 5%.
 *
 * Run: k6 run tests/k6/stress-test.js
 */

const reqDuration = new Trend('stress_req_duration', true);
const errorRate = new Rate('stress_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },    // Warm up
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 300 },
    { duration: '1m', target: 400 },
    { duration: '2m', target: 500 },    // Peak stress
    { duration: '1m', target: 500 },    // Sustain peak
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    // Intentionally relaxed — we want to find the breaking point,
    // not fail the test. Review the report output for p95/p99.
    stress_req_duration: ['p(95)<2000'],
    stress_errors: ['rate<0.10'],
  },
};

export default function () {
  const jar = http.cookieJar();

  // Mix of authenticated and unauthenticated requests
  const scenario = __VU % 4;

  switch (scenario) {
    case 0: {
      // Auth flow
      const user = TEST_USERS[__VU % TEST_USERS.length];
      const loginRes = login(http, jar, user);
      reqDuration.add(loginRes.timings.duration);
      const ok = check(loginRes, {
        'stress login 200': (r) => r.status === 200,
      });
      errorRate.add(ok ? 0 : 1);

      if (ok) {
        sleep(0.3);
        const meRes = http.get(`${BASE_URL}/auth/me`, { jar, redirects: 0 });
        reqDuration.add(meRes.timings.duration);
        check(meRes, { 'stress me 200': (r) => r.status === 200 });
      }
      break;
    }

    case 1: {
      // Catálogo cursos
      const res = http.get(`${BASE_URL}/catalogo/cursos?page=1&pageSize=12`);
      reqDuration.add(res.timings.duration);
      const ok = check(res, { 'stress cursos 200': (r) => r.status === 200 });
      errorRate.add(ok ? 0 : 1);

      sleep(0.3);

      // Catálogo simulações
      const simRes = http.get(`${BASE_URL}/catalogo/simulacoes?page=1&pageSize=12`);
      reqDuration.add(simRes.timings.duration);
      check(simRes, { 'stress simulacoes 200': (r) => r.status === 200 });
      break;
    }

    case 2: {
      // Feed (requires auth)
      const user = TEST_USERS[__VU % TEST_USERS.length];
      const loginRes = login(http, jar, user);
      reqDuration.add(loginRes.timings.duration);
      const ok = check(loginRes, { 'stress feed login 200': (r) => r.status === 200 });
      errorRate.add(ok ? 0 : 1);

      if (ok) {
        sleep(0.3);
        const feedRes = http.get(`${BASE_URL}/feed/trending?page=1&limit=10`, { jar, redirects: 0 });
        reqDuration.add(feedRes.timings.duration);
        check(feedRes, { 'stress trending 200': (r) => r.status === 200 });
      }
      break;
    }

    case 3: {
      // Health + catálogo explorar
      const healthRes = http.get(`${BASE_URL}/health`);
      reqDuration.add(healthRes.timings.duration);
      const ok = check(healthRes, { 'stress health 200': (r) => r.status === 200 });
      errorRate.add(ok ? 0 : 1);

      sleep(0.2);

      const expRes = http.get(`${BASE_URL}/catalogo/experiencias?page=1&pageSize=12`);
      reqDuration.add(expRes.timings.duration);
      check(expRes, { 'stress experiencias ok': (r) => r.status === 200 || r.status === 404 });
      break;
    }
  }

  sleep(0.5);
}
