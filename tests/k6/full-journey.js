import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, STANDARD_THRESHOLDS } from './helpers.js';

/**
 * full-journey.js — Register → Login → Browse → Inscrever Curso → Player → Telemetria
 *
 * Simulates a complete user journey from registration to course consumption.
 * 50 VUs for 3 minutes.
 *
 * Run: k6 run tests/k6/full-journey.js
 */

const journeyDuration = new Trend('journey_step_duration', true);
const errorRate = new Rate('journey_errors');

export const options = {
  stages: [
    { duration: '30s', target: 25 },
    { duration: '30s', target: 50 },
    { duration: '3m', target: 50 },    // Sustain 50 VUs
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...STANDARD_THRESHOLDS,
    journey_step_duration: ['p(95)<800'],
    journey_errors: ['rate<0.02'],
  },
};

export default function () {
  const jar = http.cookieJar();
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
  const testEmail = `k6-load-${uniqueId}@traycer.test`;

  // ── Step 1: Register ──────────────────────────────────────────────────────
  group('01_register', () => {
    const res = http.post(
      `${BASE_URL}/auth/register`,
      JSON.stringify({
        email: testEmail,
        password: 'LoadTest123!',
        nome: `K6 User ${uniqueId}`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        jar,
        redirects: 0,
      },
    );
    journeyDuration.add(res.timings.duration);
    const ok = check(res, {
      'register 200': (r) => r.status === 200,
    });
    if (!ok) {
      errorRate.add(1);
      return;
    }
    errorRate.add(0);
  });

  sleep(1);

  // ── Step 2: Get /auth/me ──────────────────────────────────────────────────
  group('02_auth_me', () => {
    const res = http.get(`${BASE_URL}/auth/me`, { jar, redirects: 0 });
    journeyDuration.add(res.timings.duration);
    check(res, {
      'me 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // ── Step 3: Browse catálogo cursos ────────────────────────────────────────
  let cursoSlug = null;
  group('03_browse_catalogo', () => {
    const res = http.get(`${BASE_URL}/catalogo/cursos?page=1&pageSize=5`, { jar, redirects: 0 });
    journeyDuration.add(res.timings.duration);
    check(res, {
      'catalogo cursos 200': (r) => r.status === 200,
    });

    // Try to extract first curso slug for next steps
    try {
      const body = JSON.parse(res.body);
      if (body.data && body.data.length > 0) {
        cursoSlug = body.data[0].slug || body.data[0].id;
      }
    } catch (_) {
      // Ignore parse errors
    }
  });

  sleep(0.5);

  // ── Step 4: View curso detail ─────────────────────────────────────────────
  if (cursoSlug) {
    group('04_curso_detail', () => {
      const res = http.get(`${BASE_URL}/catalogo/cursos/${cursoSlug}`, { jar, redirects: 0 });
      journeyDuration.add(res.timings.duration);
      check(res, {
        'curso detail ok': (r) => r.status === 200 || r.status === 404,
      });
    });

    sleep(0.5);

    // ── Step 5: Inscrever no curso ────────────────────────────────────────
    group('05_inscrever_curso', () => {
      const res = http.post(
        `${BASE_URL}/cursos/${cursoSlug}/inscrever`,
        null,
        { jar, redirects: 0 },
      );
      journeyDuration.add(res.timings.duration);
      check(res, {
        'inscrever ok': (r) => r.status === 200 || r.status === 201 || r.status === 409,
      });
    });

    sleep(0.5);
  }

  // ── Step 6: Browse simulações ─────────────────────────────────────────────
  group('06_browse_simulacoes', () => {
    const res = http.get(`${BASE_URL}/catalogo/simulacoes?page=1&pageSize=5`, { jar, redirects: 0 });
    journeyDuration.add(res.timings.duration);
    check(res, {
      'simulacoes 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // ── Step 7: Send telemetria ────────────────────────────────────────────────
  group('07_telemetria', () => {
    const events = [
      {
        event: 'page_view',
        page: '/cursos',
        timestamp: new Date().toISOString(),
        properties: { source: 'k6-load-test' },
      },
    ];
    const res = http.post(
      `${BASE_URL}/telemetria/batch`,
      JSON.stringify({ events }),
      {
        headers: { 'Content-Type': 'application/json' },
        jar,
        redirects: 0,
      },
    );
    journeyDuration.add(res.timings.duration);
    check(res, {
      'telemetria ok': (r) => r.status === 200 || r.status === 201 || r.status === 204,
    });
  });

  sleep(1);
}
