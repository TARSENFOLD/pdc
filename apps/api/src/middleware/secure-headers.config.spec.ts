import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';

import { pdcSecureHeaders } from './secure-headers.config.js';

describe('pdcSecureHeaders - CORP do BFF (api.usepdc.com)', () => {
  function buildApp() {
    const app = new Hono();
    app.use('*', pdcSecureHeaders);
    // Rota real: todo o trafego da API (incluindo 404 de /favicon.ico) passa
    // pelo middleware global, pelo que a postura CORP aplica-se a qualquer
    // resposta, nao so a rotas explicitas.
    app.get('/health', (c) => c.json({ ok: true }));
    return app;
  }

  it('emite Cross-Origin-Resource-Policy: cross-origin (nao same-origin)', async () => {
    const res = await buildApp().request('/health');

    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
    expect(res.headers.get('Cross-Origin-Resource-Policy')).not.toBe('same-origin');
  });

  it('nao emite Cross-Origin-Embedder-Policy (COEP require-corp bloquearia recursos cross-origin)', async () => {
    const res = await buildApp().request('/health');

    expect(res.headers.get('Cross-Origin-Embedder-Policy')).toBeNull();
  });

  it('mantem os restantes cabecalhos de seguranca (X-Content-Type-Options, Referrer-Policy, X-Frame-Options)', async () => {
    const res = await buildApp().request('/health');

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
  });

  it('permite pedido cross-origin (favicon) sem bloqueio CORP - origem usepdc.com', async () => {
    // Simula o pedido automatico do browser a /favicon.ico com contexto
    // cross-origin. Com CORP cross-origin o recurso nao e bloqueado pelo
    // navegador (era o sintoma reportado em producao).
    const res = await buildApp().request('/health', {
      headers: { Origin: 'https://usepdc.com' },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('Cross-Origin-Resource-Policy')).toBe('cross-origin');
  });
});
