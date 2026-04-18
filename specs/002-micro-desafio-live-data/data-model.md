# Data Model: MicroDesafio — Live Pulse e Carrossel com Dados Reais

**Date**: 2026-04-08

---

## Entidades

### LandingPulseEvent (novo — evento Socket.IO)

Evento `landing:pulse` emitido pelo BFF para todos os clientes conectados.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `count` | `number` | ✅ | Número de sessões activas na área nos últimos 60s |
| `area` | `string` | ❌ | Área de interesse (e.g., `"TECNOLOGIA"`, `"MEDICINA"`) |

**Regra**: O frontend só mostra o live pulse quando `count > 0`. Quando `count` cai para 0, o pulso desaparece.

---

### LandingActivityPayload (novo — request body)

Body enviado pelo frontend ao `POST /landing/pulse`.

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `sessionId` | `string` (UUID) | ✅ | ID único da sessão do browser (gerado com `crypto.randomUUID()`) |
| `area` | `string` | ❌ | Área detectada pelo `detectarArea()` do frontend |

---

### PulseSession (in-process, não persistido)

Estado interno do `pulseService`. Nunca exposto via API.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `active` | `Map<string, Set<string>>` | Mapa de área → Set de sessionIds activos |
| `timers` | `Map<string, NodeJS.Timeout>` | Timers TTL por `${area}:${sessionId}` |
| `pending` | `Map<string, NodeJS.Timeout>` | Timers de debounce por área |

**Transições de estado**:
1. `recordActivity(sessionId, area)` chamado
2. Cancela timer TTL anterior para `${area}:${sessionId}` se existir
3. Adiciona `sessionId` ao Set da área
4. Agenda novo timer TTL de 60s → remove `sessionId` do Set ao disparar
5. Cancela debounce pendente para a área
6. Agenda debounce de 1s → ao disparar, chama `socketService.emitirLandingPulse(area, count)`

---

### InstituicaoPublica (existente — campos adicionados ao UI)

Schema existente em `packages/shared/src/index.ts`. Nenhuma alteração ao schema.

| Campo | Tipo | UI antes | UI depois |
|-------|------|----------|-----------|
| `id` | `string` | chave React | chave React |
| `slug` | `string?` | — | link `/instituicoes/:slug` |
| `nome` | `string` | ✅ texto | ✅ texto |
| `logoUrl` | `string?` | ✅ imagem | ✅ imagem |
| `tipo` | `string?` | ❌ | ✅ badge |
| `regiao` | `string?` | ❌ | ✅ texto secundário |

**Regra zero-mock**: Cartão nunca mostra campos vazios — `regiao` e `tipo` só renderizam se `inst.regiao` e `inst.tipo` existirem e forem strings não-vazias.

---

## Novos ficheiros

```text
apps/api/src/modules/landing/
└── pulse.service.ts          # in-process counter + debounce + Socket.IO emit

apps/api/src/routes/
└── landing.ts                # POST /landing/pulse (public, no auth)
```

## Ficheiros modificados

```text
apps/api/src/modules/realtime/socket.service.ts   # auth middleware → soft (anónimos OK)
apps/api/src/modules/realtime/socket.service.ts   # add emitirLandingPulse()
apps/api/src/index.ts                              # registar rota /landing
apps/web/src/features/landing/useMicroDesafio.ts  # POST /landing/pulse após submeterTexto()
apps/web/src/features/landing/CarrosselInstituicoes.tsx  # regiao + tipo + slug link
```
