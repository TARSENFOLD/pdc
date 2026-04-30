# Análises Externas — Design Invisível, Governança e Doc-is-Law

> **Origem:** `/Transferências/PDC/Analyses/`
> - `a-engenharia-comportamental-do-pdc-v2.txt`
> - `documentao-como-lei-automatizada-no-pdc-v2.txt`
> - `pdc-inteligncia-de-marketing.txt`
>
> **Status:** OURO — análise externa que valida e expande conceitos do produto
> **Última revisão:** Abril 2026

---

## 1. Design de Herança Invisível — Validação Externa

Análise confirma e expande a filosofia do ADR-006:

### O Ubuntu no CSS

- **Off-white derivado de areia/barro** (`#F0EFE7`) → elimina branco hospitalar
- **Cinza-chumbo** para texto → estabilidade cognitiva
- **Terracotta africana** como accent → distância do azul corporativo genérico
- **Dark mode sem preto puro** → evita smear OLED e halo de texto

### Botões Assimétricos

A subversão do `border-radius` uniforme:
```
rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm
```
Emula corte tribal moderno (Adinkra/Kente) sem ser explícito. O utilizador regular sente ruptura da monotonia visual sem identificar a origem.

### Analogia Validada

> "É como alta gastronomia — um chef Michelin usa redução francesa clássica, mas no fundo há ingredientes locais angolanos. O cliente sente familiaridade no paladar, mas a técnica permanece imaculada."

---

## 2. Anti-Fraude Biomecânica — Validação do Modelo

A análise valida o modelo de telemetria comportamental:

### Dual-Layer Sanity

| Camada | Onde | O que faz |
|--------|------|-----------|
| **L1 — Edge** | Cloudflare Workers | Timestamps futuros, cliques >50Hz, tempos de permanência negativos → descarta na fronteira |
| **L2 — BFF** | Railway | Reconstrução completa da sessão no servidor, derivação do score por comportamento |

### O Bug 8.5 (Caso Pedagógico)

Frontend enviava `score: 8.5` hardcoded — todos os alunos tinham a mesma nota. Demonstra que **o browser é território hostil**: nunca confiar no cliente para declarar scores.

**Solução canónica:** Frontend é "colector passivo" — envia apenas coordenadas X/Y e scroll. BFF recalcula score inteiramente por comportamento.

### Isolamento de Hesitação vs Pensamento Profundo

O motor distingue:
- **Pensamento profundo:** mouse parado antes de click em questão complexa → sem penalização (sistema conhece o contexto cognitivo)
- **Confusão genuína:** cursor em trajectórias em 8, viagens erráticas entre opções, clicks em botões desactivados → penalização por entropia do movimento

---

## 3. Doc-is-Law como Sistema Automatizado

### Princípio Actual

> "Se o código contradiz o markdown, o código é considerado defeituoso."

### Fraqueza Identificada

A governança actual é **retroactiva** (fase S3 — auditoria pós-facto). Os drifts D2, D13, D20-D22 mostram que o código opera com falhas e a documentação só descobre depois.

### Recomendação: Contract-Driven Development

Em vez de doc → auditoria → fix, a proposta é **doc → tipos → CI → build fail**:

1. **Documento YAML/JSON** descreve schema do evento
2. **CI gera** interfaces TypeScript automaticamente
3. **Programador** usa os tipos gerados — se mudar nome de campo, build falha
4. **Dependency-cruiser** falha o PR se import paths violarem ADR-018 (separação de responsabilidades)

### Caso Concreto: JWS no Edge

**Antes (jargão opaco):**
> "Telemetria usa JWS RS256 no Edge."

**Depois (regra da 8ª série):**
> "Como garantimos que ninguém falsifica as notas de um estudante? Usamos um selo inquebrável, como um selo de cera. O nome técnico desse selo é JWS RS256."

O humano faz sentido antes do técnico entrar.

### Automação de Links Markdown

- Validator de links no CI/CD — build falha se link quebrado
- Script que lê campo `validates_against` nos tickets e verifica se o ficheiro/classe referenciado existe
- Elimina dependência de revisão humana para consistência doc↔code

---

## 4. Decisões de Stack — Validação

| Decisão | Justificação Validada |
|---------|----------------------|
| **npm workspaces** (não TurboRepo) | Build <30s, complexidade do TurboRepo não justificada |
| **Hono** (não NestJS) | Sem injection de dependências pesada, partilha de tipos via RPC end-to-end |
| **Rule of 300** | Ficheiro >300 linhas = split obrigatório → separação de responsabilidades forçada |
| **Outbox Pattern** | Nota guardada localmente primeiro, entrega externa por worker independente com retry |

---

## 5. PDC como Canal de Marketing (Análise de Mercado)

### Proposta de Valor para Instituições

- **Problema actual:** Instituições investem em marketing mas o "black box" da decisão do estudante é invisível
- **PDC como solução:** A plataforma é o **canal de distribuição** — o estudante descobre a instituição organicamente, experimenta-a em prática (experiências, simulações), e decide com dados
- **Funil controlado:** Descoberta → Experiência → Validação (mentores) → Decisão → Registo
- **Dados de decisão:** Quais cursos atraem mais, onde no funil há drop-off, que experiências convertem mais
- **Vantagem do pioneiro:** Quem chega primeiro domina a atenção e define o ecossistema

---

*Destilado de 3 transcrições de análise técnica + 1 análise de marketing · Abril 2026*
