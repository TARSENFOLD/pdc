import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // Batch should handle 50 events under 1s
  },
};

function generateBatch(size = 50) {
  const events = [];
  const timestamp = Date.now();
  for (let i = 0; i < size; i++) {
    events.push({
      eventId: randomString(16),
      type: 'user_action',
      page: 'CursoDetailPage',
      action: 'click_tab',
      timestamp: timestamp + i * 10,
      metadata: { tab: 'discussions' }
    });
  }
  return events;
}

export default function () {
  const loginData = {
    email: 'test-user@example.com',
    password: 'Password123!',
  };

  // 1. Auth
  http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });

  // 2. Post Large Batch (50 events)
  const batch = generateBatch(50);
  const batchRes = http.post(`${BASE_URL}/telemetria/batch`, JSON.stringify({ events: batch }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(batchRes, {
    'batch status is 201 or 207': (r) => [201, 207].includes(r.status),
    'batch process time ok': (r) => r.timings.duration < 2000,
  });

  sleep(2);

  // 3. Get Summary
  const summaryRes = http.get(`${BASE_URL}/telemetria/summary?userId=1`);
  check(summaryRes, {
    'summary status is 200': (r) => r.status === 200,
  });

  sleep(5);
}
