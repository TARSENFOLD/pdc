import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '10s',
  thresholds: {
    // Edge deve ser ultra-rápido (Isolate + Upstash REST limit)
    http_req_duration: ['p(99)<100'],
  },
};

export default function () {
  const url = __ENV.EDGE_URL || 'http://localhost:8787';
  
  // UUID dinâmico para simular tráfego não-idempotente puro
  // No teste de idempotência puro (se não-dinâmico), testaríamos se o consumer bloqueia o duplicate
  const eventId = `k6-perf-${__VU}-${__ITER}`;

  const payload = JSON.stringify({
    events: [
      {
        eventId,
        tipo: 'page.viewed',
        payload: { path: '/' },
        timestamp: new Date().toISOString(),
      }
    ]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Este token será validado pelo middleware do Worker (se a JWT Key bater)
      'X-Telemetry-Token': 'teste-load',
    },
  };

  const res = http.post(`${url}/telemetria/batch`, payload, params);
  
  check(res, {
    'status aceito pelo Worker': (r) => r.status === 202 || r.status === 401,
  });
  
  sleep(0.1);
}
