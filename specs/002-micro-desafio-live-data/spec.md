# Feature Specification: MicroDesafio — Live Pulse e Carrossel com Dados Reais

**Feature Branch**: `002-micro-desafio-live-data`  
**Created**: 2026-04-08  
**Status**: Implemented  
**Input**: "quando eu disse que estava a faltar algumas coisas também me referia aos carrosseis e live pulse com dados reais"

---

## Context

O componente `MicroDesafio.tsx` é o coração do produto na landing page. O frontend já tem estrutura para o Live Pulse (escuta eventos `landing:pulse` via Socket.IO) e o `CarrosselInstituicoes.tsx` já busca dados reais do catálogo. O que falta é:

1. O BFF emitir eventos `landing:pulse` em tempo real
2. O carrossel mostrar os campos enriquecidos que já existem no schema (`regiao`, `tipo`)

---

## User Scenarios & Testing

### User Story 1 — Visualizar actividade em tempo real no Micro Desafio (P1)

Um visitante anónimo acede à landing page enquanto outros utilizadores estão a fazer o desafio. O componente mostra um contador ao vivo com o número de pessoas da mesma área que estão a fazer o desafio naquele momento, criando urgência e prova social.

**Why this priority**: É o principal diferenciador da landing face à concorrência. A prova social em tempo real aumenta a taxa de início do desafio.

**Independent Test**: Pode ser testado abrindo a landing page com 2+ sessões simultâneas e verificando que o contador actualiza em todas as janelas quando alguém inicia o desafio.

**Acceptance Scenarios**:

1. **Given** um visitante está na landing com o MicroDesafio visível, **When** outro utilizador inicia o desafio na mesma área, **Then** o contador live pulse actualiza automaticamente sem reload
2. **Given** nenhum utilizador está activo naquele momento, **When** o visitante vê o MicroDesafio, **Then** o live pulse não é exibido (zero-mock: ausência de dados = sem UI)
3. **Given** o servidor de WebSocket está indisponível, **When** o visitante acede à landing, **Then** o MicroDesafio funciona normalmente sem o live pulse (degradação graciosa)
4. **Given** um utilizador está na fase `pergunta` do desafio numa área detectada, **When** o evento `landing:pulse` chega do servidor, **Then** o live pulse mostra especificamente o contador da área detectada

---

### User Story 2 — Carrossel de instituições com dados enriquecidos (P2)

Um visitante que terminou o desafio ou está a explorar a landing vê o carrossel de instituições parceiras com informação suficiente para perceber a relevância para a sua área de interesse: região geográfica e tipo de instituição.

**Why this priority**: O carrossel existe mas mostra apenas logótipo e nome. Os dados de `regiao` e `tipo` já estão disponíveis no schema e na API — só precisam de ser exibidos.

**Independent Test**: Pode ser testado acedendo à landing page com dados reais no catálogo e verificando que os cartões mostram região e tipo além do nome.

**Acceptance Scenarios**:

1. **Given** existem instituições no catálogo com campo `regiao` preenchido, **When** o carrossel renderiza, **Then** cada cartão mostra a região da instituição
2. **Given** existem instituições no catálogo com campo `tipo` preenchido, **When** o carrossel renderiza, **Then** cada cartão mostra o tipo de instituição (ex: "Universidade", "Instituto Politécnico")
3. **Given** uma instituição não tem `regiao` nem `tipo`, **When** o carrossel renderiza, **Then** apenas o nome e logótipo são mostrados sem campos vazios ou placeholders
4. **Given** o utilizador carrega num cartão do carrossel, **When** a instituição tem `slug`, **Then** é navegado para `/instituicoes/:slug`

---

### Edge Cases

- O que acontece quando o BFF reinicia enquanto a landing está aberta? → Socket reconecta automaticamente; contador reseta para 0 e desaparece até novo evento
- O que acontece se o BFF emitir `landing:pulse` com `count: 0`? → O live pulse não deve ser exibido (zero-mock)
- O que acontece se o carrossel receber instituições com `logoUrl` inválido? → Mostra a inicial do nome como fallback (já implementado)
- O que acontece se o WebSocket demorar mais de 30s a conectar na primeira visita? → O desafio arranca sem o live pulse; quando o socket conectar o contador aparece

---

## Requirements

### Functional Requirements

- **FR-001**: O BFF DEVE emitir eventos `landing:pulse` via Socket.IO quando um utilizador submete o texto livre (transição para fase de perguntas) do Micro Desafio, com payload `{ count: number; area?: string }`. Respostas individuais a perguntas (`responder()`) não disparam o pulse para evitar flood de eventos.
- **FR-002**: O BFF DEVE manter um contador em memória in-process (`Map<string, Set<string>>`) com TTL de 60 segundos por entrada de actividade, por área. Redis pode ser adoptado futuramente se o BFF escalar para múltiplas instâncias.
- **FR-003**: O frontend DEVE mostrar o live pulse apenas quando `count > 0`, nunca com placeholders ou valores fixos
- **FR-004**: O live pulse DEVE actualizar em todas as janelas abertas em tempo real sem reload da página
- **FR-005**: O `CarrosselInstituicoes` DEVE exibir o campo `regiao` quando disponível no cartão de cada instituição
- **FR-006**: O `CarrosselInstituicoes` DEVE exibir o campo `tipo` quando disponível no cartão de cada instituição
- **FR-007**: Os cartões de instituição com `slug` DEVE ser clicáveis, navegando para `/instituicoes/:slug`
- **FR-008**: O BFF DEVE debounce/agregar os eventos antes de emitir para evitar flood de eventos (mínimo 1s entre emissões por área)
- **FR-009**: O endpoint `POST /landing/pulse` DEVE aplicar rate limiting por IP (máximo 10 pedidos por minuto) para evitar inflação artificial do contador

### Key Entities

- **LandingPulseEvent**: Evento Socket.IO `landing:pulse` com `{ count: number; area?: string }` — representa o número de utilizadores activos na landing por área nos últimos 60s
- **InstituicaoPublica** (existente): `{ id, slug?, nome, descricao?, logoUrl?, tipo?, regiao? }` — dados públicos de uma instituição parceira

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: O live pulse reflecte mudanças em menos de 2 segundos após um utilizador iniciar o desafio noutro browser
- **SC-002**: O carrossel exibe região e tipo para todas as instituições que tenham esses campos preenchidos no catálogo (100% de cobertura dos campos disponíveis)
- **SC-003**: Com o servidor WebSocket indisponível, o MicroDesafio e o carrossel continuam a funcionar sem erros visíveis para o utilizador
- **SC-004**: Zero ocorrências de dados fictícios ou placeholders visíveis na landing page quando não existem dados reais

---

## Assumptions

- O backend já tem Socket.IO configurado (já existe `useSocket` no frontend, implica que o servidor aceita conexões WebSocket)
- O contador de presença é mantido in-process (não requer Redis); a decisão de usar Redis é diferida para quando o BFF precisar de escalar horizontalmente
- O `sessionId` do visitante é gerado via `crypto.randomUUID()` e persistido em `sessionStorage` (efémero por tab): um tab fechado e reaberto gera nova sessão, o que é intencional dado o TTL de 60s
- O schema `InstituicaoPublica` com campos `regiao` e `tipo` já existe nos pacotes partilhados e na API — apenas a UI não os exibe ainda
- A regra "zero mocks" é absoluta: qualquer componente que não tenha dados reais não renderiza — aplica-se ao live pulse e ao carrossel
- O carrossel standalone (`CarrosselInstituicoes.tsx`) e o carrossel dentro do `MicroDesafio` são tratados como o mesmo componente; não se criam duplicados
- Scope excludes: redesign completo do MicroDesafio, novas áreas de detecção, veredito com arquétipo (documentados como features separadas no Plano Mestre)

---

## Clarifications

### Session 2026-04-08

- Q: O spec assumia Redis para o contador TTL, mas a implementação usa in-process Map. Qual deve ficar documentado? → A: In-process Map aceite como decisão final; Redis como upgrade path futuro (actualizado FR-002 e Assumptions)
- Q: FR-001 dizia "inicia ou responde a uma pergunta" — o pulse deve disparar em cada resposta individual ou apenas na submissão do texto? → A: Apenas na submissão do texto livre (`submeterTexto()`); respostas individuais não disparam para evitar flood (FR-001 clarificado)
- Q: O endpoint `POST /landing/pulse` é público sem rate limiting — deve ter protecção? → A: Sim, adicionar rate limiting por IP (máx 10 req/min) para prevenir inflação do contador (FR-009 adicionado)
- Q: O `sessionId` usa `sessionStorage` (efémero por tab) — deve usar `localStorage` para persistir entre reopens? → A: `sessionStorage` é intencional; dado o TTL de 60s, fechar e reabrir um tab é tratado como nova sessão de presença
