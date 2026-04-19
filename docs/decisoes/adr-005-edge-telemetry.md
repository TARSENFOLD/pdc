# ADR-005 — Edge Telemetry via Cloudflare Workers

**Estado:** Aceite  
**Data:** 2026-04-19  
**Contexto:** Wave 1 / Wave 2 — Pipeline de Ingestão de Dados

---

## Contexto
O PDC gera um volume massivo de eventos de telemetria (cliques, dwellTime, hesitação, foco). Processar cada clique no BFF principal (Railway/Node.js) consome recursos de CPU/RAM desnecessários e aumenta a latência para utilizadores em Angola (servidores US-East).

---

## Decis\C3\A3o
Adoptar **Cloudflare Workers** como o Ingestor de Telemetria de Fronteira (Edge Ingestor).

1.  **Fronteira:** Apenas o endpoint `POST /telemetry/batch` migra para o Worker.
2.  **Identidade:** O Worker valida o utilizador via JWT no cookie `access_token` (lido através do domínio compartilhado `.usepdc.com` ou via header).
3.  **Persistência:** O Worker faz PUSH imediato para o **Upstash Redis** (Queue). Um processo consumidor no Railway lê do Redis e persiste no Strapi/Postgres de forma assíncrona.

---

## Justifica\C3\A7\C3\A3o
- **Economia:** 100k requests/dia gratuitos no Cloudflare (e $5/mês para 10M) é ordens de grandeza mais barato que escalar instâncias de Railway para volume de telemetria.
- **Latência:** Cloudflare tem PoPs em África (Lagos, Joanesburgo), garantindo que a telemetria é capturada com < 100ms de latência.
- **Resiliência:** O BFF principal não é sobrecarregado por picos de tráfego de telemetria ("pá de areia").

---

## Consequ\C3\AAncias
- **Positivo:** Custo de infraestrutura reduzido drasticamente.
- **Positivo:** Melhora a precisão dos cálculos de $\phi$ (Fluidez) ao reduzir o jitter de rede.
- **Negativo:** Introduz um novo serviço no deploy (Wrangler).
- **Negativo:** Exige cuidado com a partilha de cookies (SameSite=Lax obrigatório para cross-subdomain).

---

## Reavalia\C3\A7\C3\A3o
Se o volume de telemetria saturar o limite do plano gratuito do Upstash ou se a latência entre Cloudflare e Redis for impeditiva.
