# Algoritmo PDC — Decisões de Design e Arquitectura

> **Origem:** `/fv/Notes/Estou preocupada com o.txt` (linhas 987-1550, ~563 linhas)
>
> **Propósito:** Documenta o "porquê" por trás das fórmulas de φ (Fluidez), R (Resiliência), do schema de telemetria, da tabela `behavior_patterns`, do prompt system da Tina, e do motor de heurísticas. Este ficheiro preserva as decisões de design algorítmico que informam a implementação em `@pdc/shared/heuristics.ts`.
>
> **Status:** OURO — narrativa de decisão que não existe noutro lugar

---

## 1. Filosofia: "Músculo sobre Gordura"

O algoritmo do PDC **não quer prever o que o utilizador quer consumir** (modelo Twitter/TikTok). Quer prever **o que o utilizador consegue realizar**.

- **Gordura:** Logs de "clicou no botão X" → milhões de linhas inúteis.
- **Músculo:** Assinatura comportamental → uma linha por domínio por utilizador.

O PDC é uma empresa de **Data Science aplicada à educação**, não uma rede social com testes vocacionais.

---

## 2. Fluidez Cognitiva (φ) — Por que Coeficiente de Variação?

### A Fórmula

```
φ = (T_baseline / T_user) × (1 - CV)
```

Onde:
- `T_baseline` = tempo médio esperado para a tarefa (referência populacional).
- `T_user` = tempo médio do utilizador.
- `CV` = σ / μ (desvio padrão dos tempos do utilizador ÷ média dos tempos).

### Decisão de Design: Por que CV e não σ simples?

Fluidez **não é apenas rapidez** — é **consistência**. Alguém que responde rápido mas oscila muito é "instável", não "fluido".

- **CV baixo + T_user baixo** = fluido e rápido → φ alto.
- **CV alto + T_user baixo** = rápido mas errático → φ médio (penalizado pela inconsistência).
- **CV alto + T_user alto** = lento e errático → φ baixo.

### Implementação de Referência

```typescript
function calculateFluidity(actions: number[]): number {
  const mean = actions.reduce((a, b) => a + b) / actions.length;
  const variance = actions.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / actions.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  const baseline = 2000; // 2 segundos por clique (exemplo)
  return (baseline / mean) * (1 - cv);
}
```

---

## 3. Constante de Hesitação (H)

### Limiar

Se `t_entre_acções > 2× média_do_utilizador_para_essa_tarefa`, marca-se um **Evento de Hesitação**.

### Cálculo

```
H = Nº de eventos de hesitação / Nº total de acções
```

### Valor Diagnóstico

| Padrão | Insight |
|--------|---------|
| H alto em lógica, H baixo em visual | Perfil "Criativo/Visual" (não "Analítico") |
| H alto em respostas correctas | Falta de confiança (sabe mas hesita) → reforço teórico |
| H baixo + erros frequentes | Impulsividade → foco em detalhes |

---

## 4. Resiliência (R) — Reacção ao Erro

### Cenários Pós-Erro

| Cenário | Padrão | Diagnóstico |
|---------|--------|-------------|
| **A** (R < 1.0) | Erro → próxima acção mais rápida que média | Frustração/Chute — aceleração errática |
| **B** (R ≈ 1.0) | Erro → mantém calma e ritmo | **Resiliência ideal** — alta tolerância à frustração |
| **C** (R > 1.5) | Erro → "congela" (tempo muito acima da média) | Paralisia — baixa tolerância à frustração |

### Decisão de Design

R é medido como ratio `tempo_pós_erro / tempo_médio_normal`. Centrado em 1.0 como ideal. Desvios para cima ou para baixo são igualmente problemáticos (por razões diferentes).

---

## 5. Schema de Telemetria — Design Etológico

O schema **não regista apenas a acção** — regista o **estado cognitivo no momento da acção**.

### Campos Psicométricos (o "Músculo")

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `timeSinceLastAction` | ms | Mede fluidez vs hesitação |
| `dwellTime` | ms (opcional) | Tempo parado sobre um elemento |
| `velocity` | número (opcional) | Velocidade de execução |
| `isInterrupted` | boolean | Mudou de aba ou perdeu foco? |

### Contexto de Dispositivo (crucial para Angola)

| Campo | Valores | Razão |
|-------|---------|-------|
| `connectionType` | wifi, 4g, 3g, unknown | Compensar latência de rede no cálculo de φ |
| `deviceType` | mobile, desktop, tablet | Normalizar tempos de reacção por tipo de input |

### 3 Trackers Específicos

1. **Tracker de Hesitação:** Quanto tempo com rato/dedo parado sobre opção antes de decidir.
2. **Tracker de Persistência:** Quantas vezes reinicia/tenta caminhos diferentes após erro (Sim Tipo 2).
3. **Tracker de Foco:** Page Visibility API — saiu da aba para Google/WhatsApp?

### Fluxo de Dados (Performance)

```
Frontend: batch 10 eventos → navigator.sendBeacon ou fetch(keepalive:true)
    ↓
BFF (Hono): valida com Zod → PUSH para Redis (não espera pela DB)
    ↓
Worker (background, 5 em 5 min): calcula φ/R/H → UPSERT behavior_patterns
```

**Decisão:** Não validar no POST /telemetry. Seria lento. Redis como buffer, worker como processador.

---

## 6. Tabela `behavior_patterns` — Agregação por Domínio

### Decisão Arquitectural

Em vez de 1 milhão de logs, **uma linha por área de interesse**. Query do Relatório Vocacional: `SELECT * FROM behavior_patterns WHERE user_id = ?` — instantânea.

### Schema

| Coluna | Tipo | Propósito |
|--------|------|-----------|
| `user_id` | UUID FK | Identificador (nunca nome/email nos cálculos) |
| `domain_id` | VARCHAR(50) | Ex: 'eng_civil', 'medicina', 'gestao' |
| `success_rate` | DECIMAL(5,2) | 0-100% — performance técnica |
| `technical_score` | INT | Pontuação bruta das simulações |
| `cognitive_fluidity` | DECIMAL(3,2) | φ: 0.0 (muita hesitação) → 1.0 (fluido) |
| `resilience_index` | DECIMAL(3,2) | R: ideal ≈ 1.0 |
| `focus_stability` | DECIMAL(3,2) | Tempo permanência vs distrações |
| `decision_speed_avg` | INT | Média ms por decisão crítica |
| `tina_summary_json` | JSONB | Insights qualitativos da IA (flexível) |

### Índices

- `(user_id)` — consulta rápida por estudante.
- `(domain_id)` — consulta rápida por área ("100 alunos com resilience > 0.8 em Engenharia").
- `UNIQUE(user_id, domain_id)` — uma linha por par.

### JSONB para Flexibilidade

`tina_summary_json` permite que a IA guarde observações específicas sem mudar schema:
> "Demonstra padrão de raciocínio espacial avançado, mas falha em lógica dedutiva básica."

---

## 7. Independência da IA — A Hierarquia da Verdade

### Decisão Fundacional (linha 1443 do original)

> "Não quero que o PDC dependa de IA do tipo 'sem IA ou se ela falhar o PDC não existe ou perde credibilidade'."

### As 3 Camadas

| Camada | Nome | Dependência | Fallback |
|--------|------|------------|----------|
| **L1** | Telemetria Pura (Factos) | Nenhuma | Indiscutível — dados brutos |
| **L2** | Algoritmo Matemático (φ, R, H) | Corre no Node 24, sem IA | É a autoridade do PDC |
| **L3** | Tina (Interpretação) | IA externa (DeepSeek/Ollama) | Heurísticas pré-escritas |

### Teste de Credibilidade

Se removeres a Tina hoje, o Relatório Vocacional **continua a mostrar** gráficos, índices de fluidez e matches técnicos. O estudante **ainda decide** com base nos números. A Tina é o "luxo" da explicação.

### Motor de Heurísticas (Circuit Breaker)

Se a API da IA demorar >2s ou der erro, o Hono cancela e serve o **Relatório Heurístico** (regras matemáticas puras). O utilizador nem percebe.

Intervalos de decisão:

| Índice | Range | Nível | Insight Estático |
|--------|-------|-------|-----------------|
| φ | ≥ 0.8 | EXCELENTE | "Execução fluida e instintiva. Alta confiança nas decisões técnicas." |
| φ | 0.5–0.8 | ESTÁVEL | "Ritmo consistente, com pausas para processamento lógico." |
| φ | < 0.5 | VULNERÁVEL | "Hesitação elevada. Custo cognitivo superior à média." |
| R | 0.9–1.1 | EXCELENTE | "Mantém precisão e ritmo após erros. Alta tolerância à frustração." |
| R | > 1.5 | VULNERÁVEL | "Erro causa paralisia temporária. Mais tempo para recuperar foco." |
| R | < 0.7 | CRÍTICO | "Padrão de desistência ou chute após falhas." |

---

## 8. Prompt System da Tina — Tradução de Dados para Narrativa

### Personalidade

> "És a Tina, o motor de inteligência do PDC. A tua voz é analítica, encorajadora, mas impiedosamente honesta. Não dás conselhos genéricos; dás diagnósticos baseados em evidências."

### Regras de Geração

- **Temperatura 0.3** — determinismo, não criatividade. Ler números e dizer verdade.
- **Filtro de Honestidade** — Tina deve ter "Negative Insight". Dizer o que está errado é o diferencial.
- **Sem chat livre** — Tina só responde sobre progresso e dados. Não é amiga, é infraestrutura.
- **PII Stripping** — Prompt recebe UUID, nunca nome/email.
- **Saída Estruturada** — JSON Output para evitar prompt injection.

### Exemplo de Output Elite

> "Embora tenhas concluído a simulação de Engenharia com sucesso técnico, a tua Fluidez Cognitiva caiu drasticamente nos últimos 15 minutos. Isto sugere que, embora sejas capaz, o esforço mental exigido para esta área pode ser insustentável a longo prazo sem um reforço nas bases de lógica."

### Integração

1. Worker calcula φ/R/H.
2. Hono busca no Strapi as exigências do curso.
3. Tina recebe resumo e gera texto refinado.
4. Se Tina falhar → fallback para heurísticas estáticas (utilizador nunca vê vazio).

---

## 9. Segurança dos Dados Comportamentais

### Anti-Fraude (Integridade da Telemetria)

- **HMAC por lote** — cada batch tem assinatura com chave temporária de sessão.
- **Validação de Sanidade** — rejeitar eventos impossíveis (simulação de 10min resolvida em 2s).

### Privacidade por Design

- Motor de IA e logs trabalham **apenas com UUID**.
- Ligação UUID↔identidade isolada na DB do Strapi.
- Encriptação em repouso na `behavior_patterns`.
- Botão "Descarregar todos os meus dados" (RGPD).

---

## 10. O Pitch do Músculo (Como Vender)

### Antes (gordura)
> "Temos estudantes que gostam de engenharia."

### Agora (músculo)
> "Temos um cluster de 450 estudantes com estabilidade de foco >85% e fluidez cognitiva de topo em simulações técnicas de engenharia. São os candidatos com menor risco de evasão no mundo."

### 3 Modelos de Monetização

1. **Predictive Match:** Vender acesso a estudantes pré-validados. "500 alunos com 95% compatibilidade com o vosso curso."
2. **Seguro contra Evasão:** Para pais. "Pague X e garanto, com 200h de dados, que o seu filho não desiste no 1.º ano."
3. **Infraestrutura como Serviço:** Universidades integram o PDC no processo de admissão via LTI 1.3.

---

*Destilado de `/fv/Notes/Estou preocupada com o.txt` (linhas 987-1550) · Abril 2026*
