import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  vus: 50,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<600'],
  },
};

export default function () {
  const loginData = {
    email: 'test-user@example.com',
    password: 'Password123!',
  };

  // 1. Auth (if not using cookies)
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });

  // 2. List Threads for Course 1
  const listRes = http.get(`${BASE_URL}/discussions/course/1?page=1`);
  check(listRes, {
    'list discussions status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 3. Create a Thread
  const threadRes = http.post(`${BASE_URL}/discussions`, JSON.stringify({
    titulo: `Dúvida de performance ${Math.random()}`,
    corpo: 'Como otimizar queries no Strapi v4?',
    cursoId: 1
  }), { headers: { 'Content-Type': 'application/json' } });

  check(threadRes, {
    'create thread status is 201': (r) => r.status === 201,
  });

  if (threadRes.status === 201) {
    const threadId = threadRes.json().id;

    sleep(1);

    // 4. List Replies
    const repliesRes = http.get(`${BASE_URL}/discussions/${threadId}/replies`);
    check(repliesRes, {
      'list replies status is 200': (r) => r.status === 200,
    });

    // 5. Post a Reply
    const replyRes = http.post(`${BASE_URL}/discussions/${threadId}/replies`, JSON.stringify({
      texto: 'Recomendo usar populate seletivo e paginação.'
    }), { headers: { 'Content-Type': 'application/json' } });

    check(replyRes, {
      'post reply status is 201': (r) => r.status === 201,
    });
  }

  sleep(5);
}
