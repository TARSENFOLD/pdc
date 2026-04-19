import http from 'k6/http';
import { sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '30s', target: 500 }, // fast ramp-up
    { duration: '1m', target: 500 },  // stay at peak
    { duration: '30s', target: 0 },   // fast ramp-down
  ],
};

export default function () {
  // Simulate basic browse activity during spike
  http.get(`${BASE_URL}/catalogo/cursos`);
  sleep(1);
  http.get(`${BASE_URL}/feed?tab=para-ti&page=1`);
  sleep(2);
}
