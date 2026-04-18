# ADR 005: Arquitetura Híbrida de Telemetria no Edge

## Status
Aceite (Abril 2026)

## Contexto
A telemetria comportamento no PDC v2 gera um volume de requisições massivo (estimado em 100k+ eventos por dia). Processar todos esses eventos diretamente no BFF principal no Railway é ineficiente em termos de custo (CPU/RAM do Node.js) e performance (latência para usuários em Angola).

## Decisão
Implementar uma infraestrutura híbrida de telemetria utilizando Cloudflare Workers para ingestão no Edge e o BFF no Railway para processamento e persistência.

### 1. Fronteiras de Responsabilidade
- **Cloudflare Workers (Edge):**
    - Endpoints de ingestão: `POST /telemetria/batch` (autenticado) e `POST /landing/pulse` (público).
    - Endpoints de catálogos públicos (cache no edge): `GET /explorar`, `/cursos`, `/simulacoes` (apenas metadados públicos).
- **Railway (BFF Principal):**
    - Autenticação (JWT httpOnly), Autorização (RBAC), Lógica de Negócio (Matrículas, Simulações complexas, Mensagens).
    - Processamento assíncrono da telemetria e escrita no Strapi.

### 2. Validação e Segurança
- O Worker no Edge valida o utilizador através de um **Telemetry Token** curto, enviado no header `X-Telemetry-Token`.
- Este token é emitido pelo BFF principal no login ou no endpoint de `/bootstrap`.
- Os cookies `access_token` e `refresh_token` permanecem `SameSite=Strict` e vinculados ao domínio da API principal (`api.usepdc.com`), protegendo a auth principal contra vazamentos no Edge.

### 3. Pipeline de Escrita (Resiliência)
- O Worker não escreve diretamente no PostgreSQL/Strapi.
- Os eventos são enviados para uma fila (Queue) no **Upstash Redis**.
- Um worker secundário no Railway consome essa fila de forma assíncrona, garantindo que picos de tráfego na telemetria não sobrecarreguem o banco de dados principal.

## Consequências
- **Positivas:**
    - Custo operacional de ingestão próximo de zero (plano gratuito/base da Cloudflare).
    - Redução drástica na latência para usuários em Angola (PoPs locais).
    - BFF principal livre de overhead de telemetria.
- **Negativas:**
    - Complexidade adicional na gestão de tokens (Telemetry Token).
    - Necessidade de gerenciar segredos (Upstash API Key) em dois ambientes (Railway e Cloudflare).

## Referências
- Spec 1a81656f — Modelo de Telemetria e Perfil Vocacional.
- CONSTITUTION.md — Princípio II (Stateless Security & Persistence).