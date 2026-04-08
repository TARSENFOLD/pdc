import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL, STANDARD_THRESHOLDS, TEST_USERS, login } from './helpers.js';

/**
 * feed-load.js — Feed with concurrent users, tabs, scroll pagination
 *
 * Simulates N users browsing the feed: trending, personalised, paginated.
 * 100 VUs sustained for 5 minutes.
 *
 * Run: k6 run tests/k6/feed-load.js
 */

const feedDuration = new Trend('feed_duration', true);
const errorRate = new Rate('feed_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '5m', target: 100 },   // Sustain 100 VUs
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    ...STANDARD_THRESHOLDS,
    feed_duration: ['p(95)<500'],
    feed_errors: ['rate<0.01'],
  },
};

export function setup() {
  // Pre-authenticate one user to verify connectivity
  const jar = http.cookieJar();
  const res = login(http, jar, TEST_USERS[0]);
  check(res, { 'setup login ok': (r) => r.status === 200 });
}

export default function () {
  const jar = http.cookieJar();
  const user = TEST_USERS[__VU % TEST_USERS.length];

  // Login
  const loginRes = login(http, jar, user);
  if (loginRes.status !== 200) {
    errorRate.add(1);
    return;
  }
  errorRate.add(0);

  // 1. Trending feed (public)
  const trendingRes = http.get(`${BASE_URL}/feed/trending?page=1&limit=10`, { jar, redirects: 0 });
  feedDuration.add(trendingRes.timings.duration);
  check(trendingRes, {
    'trending 200': (r) => r.status === 200,
  });

  sleep(1);

  // 2. Personalised feed
  const personalRes = http.get(`${BASE_URL}/feed?page=1&limit=10`, { jar, redirects: 0 });
  feedDuration.add(personalRes.timings.duration);
  check(personalRes, {
    'personal feed 200': (r) => r.status === 200,
  });

  sleep(0.5);

  // 3. Paginate — page 2
  const page2Res = http.get(`${BASE_URL}/feed?page=2&limit=10`, { jar, redirects: 0 });
  feedDuration.add(page2Res.timings.duration);
  check(page2Res, {
    'feed page 2 status ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.5);

  // 4. Trending page 2
  const trending2Res = http.get(`${BASE_URL}/feed/trending?page=2&limit=10`, { jar, redirects: 0 });
  feedDuration.add(trending2Res.timings.duration);
  check(trending2Res, {
    'trending page 2 ok': (r) => r.status === 200 || r.status === 404,
  });

  sleep(1);
}
