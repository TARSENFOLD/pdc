import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '3m', target: 300 },
    { duration: '5m', target: 500 }, // Stress it to 500
    { duration: '2m', target: 0 },   // Recovery
  ],
  // No hard thresholds here, we want to observe where it fails.
};

export default function () {
  const loginData = {
    email: 'test-user@example.com',
    password: 'Password123!',
  };

  // 1. Login
  http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginData), {
    headers: { 'Content-Type': 'application/json' },
  });

  sleep(1);

  // 2. Feed
  http.get(`${BASE_URL}/feed?tab=para-ti&page=1`);
  sleep(2);

  // 3. Browse Courses
  http.get(`${BASE_URL}/catalogo/cursos`);
  sleep(2);

  // 4. Browse Simulations
  http.get(`${BASE_URL}/catalogo/simulacoes`);
  sleep(5);
}
