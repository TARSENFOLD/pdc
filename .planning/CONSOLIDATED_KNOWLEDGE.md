# 🏛️ CONSOLIDATED KNOWLEDGE BASE — Ouro de FV (PDC v2)

Este documento é a destilação final de **128+ arquivos de referência** ingeridos atomicamente do diretório `/home/cj/fv/`. Ele serve como a **Constituição Técnica e Estética** inabalável para o refactor do PDC v2.

---

## 🎨 1. Mandato Estético "Soul & Elite"

O design deve ser minimalista, técnico e de luxo, evitando a "Deriva de Influencer".

### Paleta de Cores
- **Fundo Primário:** Off-white sand (#F8F9FA).
- **Acento Soul:** Terracotta (#D2691E) usado apenas em detalhes e com opacidade baixa (5-10%) para elevação.
- **Dark Profundo:** Anthracite/Dark (#0B0E14). 
- **⚠️ PROIBIÇÃO:** Proibido o uso de preto puro (#000000) e branco puro (#FFFFFF) em grandes superfícies para evitar fadiga visual e manter o aspecto premium.

### Tipografia
- **UI & Leitura:** Inter.
- **Display & Títulos:** Instrument Serif.
- **Dados & Código:** JetBrains Mono.

### Geometria e Camadas
- **Raio Assimétrico:** `--radius-asym-a` (18px 6px 18px 6px) para cards e botões principais.
- **Elevação:** Uso de `backdrop-filter: blur(20px)` e bordas sutis (1px com 5% de opacidade) em vez de sombras pesadas.

---

## 🧠 2. O Algoritmo de Decisão ("The Algorithm")

A soberania do PDC reside na matemática determinística, não apenas em IA.

### Variáveis Críticas
- **$\phi$ (Fluidity):** Calculada como o inverso da variância na distribuição de tempos de reação. Mede a intuição técnica.
- **$R$ (Resilience):** Velocidade de recuperação do padrão de resposta após um erro detectado.
- **Status da IA (Tina):** A IA é uma **camada de tradução**. Ela lê os índices $\phi$ e $R$ e gera insights qualitativos. Se a IA falhar, as heurísticas matemáticas (hardcoded) são o fallback soberano.

### O Símbolo "8.5"
- O valor `8.5` hardcoded nas simulações deve ser erradicado. Ele deve ser substituído pela derivação dinâmica baseada na performance real comparada ao benchmark da instituição.

---

## 👤 3. Arquitetura de Identidade e Privacidade

Separação rígida para garantir segurança e profissionalismo.

### Matriz de Roles (6 Categorias)
1. **Estudante:** Foco em progresso e descoberta.
2. **Mentor:** Foco em curadoria e feedback.
3. **Instituição:** Foco em branding e captação (Marketplace).
4. **Comité Científico:** Validação técnica de conteúdos.
5. **Moderador:** Segurança e conformidade.
6. **Super Admin:** Gestão total da infraestrutura.

### Fronteira Identidade vs. Progresso
- **Perfil Público (Identidade):** Nome, Headline, Bio, Vínculos Aprovados, Conquistas Públicas.
- **Dashboard Privado (Progresso):** Métricas comportamentais, Telemetria bruta, Simuladores em curso, Recomendações de IA.
- **Regra de Ouro:** Métricas de "vulnerabilidade" (hesitação, erros) nunca são públicas.

---

## 🏗️ 4. Padrões de Engenharia (Camada de Ferro)

### Modelo de 5 Camadas
1. **Shared:** Contratos Zod e tipos TS (Verdade Única).
2. **BFF (Hono):** Orquestração, Telemetria e Segurança. (Limite de 300 linhas por arquivo).
3. **Strapi v5:** Gestão de conteúdo editorial e persistência.
4. **Cloudflare R2:** Armazenamento de assets e evidências.
5. **Ecossistema:** LTI 1.3, Integrações externas.

### Event-Driven & Outbox
- **Idempotência:** Todo evento (ex: conclusão de simulação) deve passar por uma tabela de Outbox para garantir processamento "exactly-once" e resiliência a falhas de rede.

---

## 🚩 5. Drifts Constitucionais e Débito Técnico (Estado Real)

1. **DC-01 (EditorialStateBadge):** Falta o estado 'hidden' definido na spec original. — T-REM-6
2. **DC-02 (Functionality Mapping):** 🔴 **Corrigido 30 Abril 2026** — 9 requisitos rebaixados de `[x]` para `[~]`/`[P]` em `REQUIREMENTS.md`. Ver lista em `STATE.md`.
3. **DC-03 (RBAC):** Gaps nos eventos de domínio disparados por moderadores.
4. **Bug de Meia-Noite (Redis):** ✅ **Resolvido** — SET NX EX 7d (UUID-based). Confirmado em `STATE.md` D6.
5. **Triplo Desync Vocacional (H1):** FE/BFF/Strapi têm 3 schemas diferentes para perfil vocacional. Ver `arquivo-fundacional/06-engenharia/entitlements-core-trio-analysis.md`.
6. **Reputação Fantasma:** `/reputation` existe no BFF, mas zero consumidores no frontend.
7. **Feed sem Algoritmo Real:** Feed existe com pesos admin-tunable, mas ranking vocacional de 4 fases (spec `15428b59`) **não implementado**.

---

## 🚀 6. Mapa de Execução (Estado Real)

- **Waves 0-1 (Fundação + Auth + Pipeline):** ✅ Concluídas
- **Waves W-1 a W6 (Auditoria):** ✅ 38 tickets auditados (25 Done, 12 Partial, 1 Missing)
- **Fase D (Remediação Post-Audit):** ⏳ Em curso (T-REM-1..6)
- **Wave 2.5 (Sync Constitucional):** ⏳ Backlog (E1–E5)
- **Futuro (Pós-Remediação):** Gamificação, i18n, Mobile Release

> 📌 Roadmap completo: `.planning/roadmap.md`
> 📌 Produto disruptivo: `docs/ROADMAP_PRODUTO_DISRUPTIVO.md`

---

## 📚 7. Arquivo Fundacional (Referência Detalhada)

As specs originais do Traycer (~266KB, 13 ficheiros) foram destiladas em `docs/arquivo-fundacional/09-traycer-specs/`:

| Ficheiro | Conteúdo |
|----------|----------|
| `produto-visao-arquitectura.md` | Visão, diagnóstico pré-v2, stack, fases |
| `mapa-paginas-features-transversais.md` | 80+ rotas, 6 zonas, 10 features com modelos |
| `design-system-completo.md` | Tokens, anti-padrões, componentes base |
| `algoritmos-dados-seguranca.md` | Ranking, telemetria, segurança, modelo dados, IA, LTI, SEO |

> 📌 Índice completo: `docs/arquivo-fundacional/README.md` (28 ficheiros em 9 secções)

---
*Última actualização: 30 de Abril de 2026 · Guardião da Alma do PDC*