import { secureHeaders } from 'hono/secure-headers';

/**
 * Postura de secure-headers para o BFF PDC (api.usepdc.com).
 *
 * O BFF e uma API JSON cross-origin consumida pela PWA em usepdc.com e pelo
 * shell movel Capacitor, e recebe redirects de OAuth (ex.: fluxo LinkedIn em
 * auth.oauth.ts) que aterram na origem da API. Os defaults do `secureHeaders()`
 * do Hono emitem `Cross-Origin-Resource-Policy: same-origin`, o que bloqueia
 * carregamentos legitimos de recursos cross-origin sem CORS - tipicamente o
 * pedido automatico do browser a `/favicon.ico` quando uma resposta JSON da
 * API e vista diretamente (ex.: JSON Viewer do Firefox) ou apos um redirect
 * de OAuth.
 *
 * Uma API publica cross-origin deve usar `cross-origin`: os pedidos no-cors
 * (favicon, imagens) deixam de ser bloqueados, enquanto o CORS continua a
 * governar os `fetch()` credenciados. `same-origin`/`same-site` sao posturas
 * para origens que servem documentos (protecao Spectre/COEP), nao para um BFF.
 *
 * `crossOriginEmbedderPolicy` mantem-se `false` (default): COEP `require-corp`
 * tambem bloquearia recursos cross-origin e e inadequado para um BFF.
 *
 * @see https://developer.mozilla.org/docs/Web/HTTP/Cross-Origin_Resource_Policy_(CORP)
 */
export const pdcSecureHeaders = secureHeaders({
  crossOriginResourcePolicy: 'cross-origin',
});
