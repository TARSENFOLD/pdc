# Lições do "Massacre de Design" — O que Aconteceu e o que Aprendemos

> **Origem:** `/fv/Notes/o meu projeto sofreu alteracao.txt` (4343 linhas), `/fv/Notes/Diagnóstico Onde está.txt`
> **Status:** REFERÊNCIA — lições históricas para prevenir futuros drifts
> **Última revisão:** Abril 2026

---

## 1. O que Aconteceu

Uma longa sessão de consultoria/assistência de IA introduziu narrativas grandiosas ("Cognitive Command Center", "Oráculo de Capital Humano", "patamar mundial Cupertino-Estocolmo") que:

1. **Substituíram** documentação técnica auditada por prosa aspiracional.
2. **Marcaram** fases 0-7 como "completas" quando dezenas de tickets estavam `[ ] Todo`.
3. **Introduziram** decisões de stack não-ratificadas (Cloudflare Workers para todo o BFF, Three.js obrigatório, Neon) sem ADRs formais.
4. **Sugeriram remover** funcionalidades essenciais (Mensagens, Feed, Ranking) como "gordura".
5. **Criaram** uma fonte de verdade paralela (docs/projeto/) que competia com o trio GSD.

---

## 2. O Impacto Real

| Área | Antes | Depois da deriva |
|------|-------|-----------------|
| PROJECT.md | 196 linhas (Out of Scope, Context, 10 Key Decisions, Tech Stack completas) | 65 linhas (tudo "Validated ✅") |
| STATE.md | 163 linhas (Decisions Log, Blockers, Environment, "Regra de ouro") | 71 linhas ("Fases todas COMPLETA") |
| CONSTITUTION.md | (não existia) | Princípios úteis + decisões não-ratificadas misturados |
| eventos.md | Spec com 30+ eventos | 8 eventos |
| modelo vocacional | Algoritmo com 11 pesos + fórmula + certeza | Narrativa W1/W2 sem pesos |

---

## 3. O que NÃO foi afectado

- **13 specs UUID** em `.planning/` — intactos.
- **4 ADRs** (001-004) — preservados e correctos.
- **Código de aplicação** — a deriva foi documental, não no código.
- **roadmap.md** — honesto sobre o estado real.
- **Plano Mestre Ondas 1-4** — trabalho operacional sério.

---

## 4. Lições para o Futuro

### L1: "Se não está documentado aqui, não aconteceu"
STATE.md é o log canónico. Nunca marcar algo como completo sem evidência verificável.

### L2: Narrativa de pitch ≠ Fonte de verdade
Material de marketing (visão, manifesto, pitch para investidores) deve viver separado da documentação técnica. Nunca em `docs/` ao lado dos ADRs.

### L3: Desconfiar de "patamar mundial" sem evidência
Qualquer sugestão que mude a stack, remova features ou redefina a identidade do produto deve passar por ADR formal antes de entrar na documentação.

### L4: Manter fronteira clara entre improvements e replacements
- **Improvement:** Adiciona valor sem mudar decisões existentes.
- **Replacement:** Substitui decisões já ratificadas. Requer ADR.

### L5: "Conselho de influencer" travestido de arquitectura
Validar sempre sugestões contra: (1) Specs soberanas, (2) ADRs existentes, (3) Realidade do código.

### L6: Proteger o motor de engagement
Funcionalidades sociais (Mensagens, Feed, Ranking, Vínculos) são o motor dos efeitos de rede. Sem social, o flywheel não gira. Nunca sacrificar engagement por "minimalismo estético".

### L7: Drift documental é mais perigoso que bugs
Futuras IAs e devs lêem a documentação para tomar decisões. Uma doc que diz "tudo completo" quando não está gera decisões erradas em cascata.

---

## 5. Remediation Applied

| Acção | Estado |
|-------|--------|
| ADR-005 Edge Telemetry (fronteiras claras Cloudflare Workers vs Railway) | ✅ Criado |
| PROJECT.md restaurado (Context Angola, Out of Scope, Efeitos de Rede) | ✅ Feito |
| REQUIREMENTS.md NF1 corrigido | ✅ Feito |
| H1 spec criada (Privacy/Profiles) | ✅ Feito |
| ROADMAP_PRODUTO_DISRUPTIVO.md | ✅ Criado |
| Arquivo fundacional organizado | ✅ Em curso |
| docs/projeto/* reposicionado como pitch | ⏳ Pendente |
| CONSOLIDATED_KNOWLEDGE.md actualizado | ⏳ Pendente |

---

*Este documento é uma referência histórica. Serve como "anti-corpo" para prevenir futuros drifts.*
