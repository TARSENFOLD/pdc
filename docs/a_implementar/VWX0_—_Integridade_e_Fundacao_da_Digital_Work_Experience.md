# VWX0 — Integridade e Fundação da PDC Digital Work Experience

## Status

Planeado · Decisão arquitetural: `ADR-054` · Execução obrigatória antes de exposição pública de `programa.tipo = vwx`.

## Objetivo

Preparar o PDC para suportar simultaneamente:

1. **Experiências Curriculares institucionais**, preservando o modelo original do produto;
2. **PDC Digital Work Experiences**, jornadas profissionais digitais criadas com empresas e outras organizações.

A wave começa por corrigir drifts e bugs já existentes e termina com contratos, persistência e feature flag suficientes para iniciar o player VWX sem dívida estrutural.

## Não objetivos

- Lançar publicamente a primeira VWX.
- Implementar recrutamento ou candidatura a emprego.
- Criar um novo role `empresa`.
- Substituir Curso, Experiência, Simulação ou Projeto.
- Tornar IA obrigatória.
- Emitir alegações de blockchain sem infraestrutura verificável.

## Sequência obrigatória

```text
VWX0-A Integridade atual
  ↓
VWX0-B Contratos canónicos
  ↓
VWX0-C Persistência aditiva
  ↓
VWX0-D Feature flag e RBAC
  ↓
VWX0-E Testes de caracterização
  ↓
VWX1 Builder + Player
```

---

# VWX0-A — Integridade do sistema atual

## VWX0-A1 — Alinhar estados editoriais de Experiência

### Problema

`EstadoEditorialSchema` aceita `rejected` e `hidden`, mas o schema Strapi de Experiência não aceita esses valores. A rota também valida o estado como string livre e permite transições que podem falhar apenas na persistência.

### Implementação

- Criar schema específico `AtualizarExperienciaEstadoSchema` em `@pdc/shared`.
- Definir explicitamente estados e transições válidas.
- Alinhar Strapi, BFF, UI e documentação.
- Persistir `motivoRejeicao`, `rejeitadoEm` e `rejeitadoPor` quando aplicável.
- Garantir que `hidden`, `rejected`, `draft`, `review` e `archived` nunca entram no catálogo público.

### DoD

- Transição inválida retorna `400` antes de contactar o Strapi.
- Rejeição válida persiste estado e motivo.
- Testes cobrem criador, Comité, moderador e super admin.
- O catálogo continua a devolver apenas `approved` e `published`.

## VWX0-A2 — Corrigir estatísticas institucionais de Programa

### Problema

A rota de estatísticas procura `estado = activo`, valor inexistente no schema de Programa.

### Implementação

- Contar Programas com `estado in [approved, published]` ou separar métricas por estado.
- Renomear `programasActivos` para um contrato semanticamente correto, mantendo compatibilidade temporária se necessário.
- Adicionar teste de integração para impedir regressão.

### DoD

- Uma instituição com Programa publicado recebe total correto.
- Nenhuma query usa estado não declarado no SSOT.

## VWX0-A3 — Uniformizar IDs Strapi v5 em Experiência

### Problema

Algumas rotas usam `id` diretamente para update, enquanto outras partes do sistema tratam `documentId` e ID persistido.

### Implementação

- Reutilizar `findStrapiEntity` e `persistedEntityId` nas rotas de Experiência.
- Eliminar update por identificador ambíguo.
- Testar leitura e update por `id` e `documentId`.

### DoD

- Edição e transição funcionam com ambos os identificadores expostos pelo mapper.
- Não existem chamadas `PUT /experiencias/${id}` sem resolução prévia.

## VWX0-A4 — Garantir gratuidade server-side

### Implementação

- BFF força `gratuito: true` em create e update.
- Lifecycle do Strapi rejeita tentativa de `gratuito: false`.
- Testes cobrem payload malicioso.

### DoD

- Cliente nunca consegue monetizar uma Experiência Curricular.
- A regra não depende apenas do frontend ou do Zod do cliente.

## VWX0-A5 — Completar renderer dos itens de Experiência

### Implementação

Criar renderers explícitos e seguros para:

- `video`
- `texto`
- `imagem`
- `galeria`
- `pdf`
- `link`
- `iframe`
- `depoimento`
- `faq`
- `cta`
- `estatistica`
- `audio`

Regras adicionais:

- sanitização e allowlist para iframe;
- lazy loading de média;
- fallback acessível;
- feedback quando o formato estiver inválido;
- telemetria de visualização sem volume excessivo.

### DoD

- Todos os tipos do contrato possuem renderer ou erro editorial explícito.
- Testes unitários cobrem pelo menos um caso por tipo.

## VWX0-A6 — Remover alegação de blockchain não implementada

### Implementação

- Substituir a copy por “credencial verificável pelo PDC” até existir tecnologia correspondente.
- Rever páginas de certificados, landing e documentação para alegações semelhantes.

### DoD

- Nenhuma UI pública afirma blockchain sem prova técnica.

---

# VWX0-B — Contratos canónicos

## VWX0-B1 — Adicionar subtipo VWX a Programa

### Contrato

```ts
ProgramaTipoSchema = z.enum([
  'standard',
  'shadowapro',
  'eduvisit',
  'vwx',
]);
```

Adicionar formato especializado:

```ts
VwxFormatoSchema = z.enum([
  'core',
  'sprint',
  'challenge',
  'sector_journey',
]);
```

Campos de Programa específicos de VWX devem viver em objeto opcional `vwxConfig`, validado apenas quando `tipo === 'vwx'`.

### `vwxConfig` inicial

- `formato`
- `profissaoAlvo`
- `senioridadeAlvo`
- `duracaoMinutosEstimada`
- `competenciasAlvo[]`
- `temProjetoFinal`
- `temCredencial`
- `opportunityPathwayEnabled`
- `publicoAlvo`
- `idioma`

### DoD

- `ProgramaSchema` rejeita `vwx` sem configuração mínima.
- Programas existentes continuam válidos sem migração destrutiva.

## VWX0-B2 — Criar contrato `ProgramaEtapa`

### Tipos iniciais

```text
conteudo
tarefa
simulacao
checkpoint
projeto_final
debrief
reflexao
oportunidade
```

### Campos mínimos

- `id`
- `programaId`
- `titulo`
- `descricao`
- `tipo`
- `ordem`
- `duracaoMinutos`
- `obrigatoria`
- `visibilidade`
- `requisitosEtapasIds[]`
- `conteudoRef` opcional
- `conteudoNativo` opcional
- `tarefaConfig` opcional
- `rubricaId` opcional
- `submissaoConfig` opcional
- `debriefConfig` opcional
- `estado`

### Invariantes

- ordem única por Programa;
- grafo de requisitos sem ciclos;
- etapa `oportunidade` sempre opcional;
- etapa não pode referenciar conteúdo privado de outra organização sem autorização;
- etapa publicada é imutável em campos críticos ou cria nova versão.

## VWX0-B3 — Criar contratos de Rubrica e Entrega

### Rubrica

- critérios ordenados;
- descrição observável;
- peso;
- escala;
- evidência esperada;
- feedback-modelo opcional;
- soma dos pesos igual a 100.

### Entrega

- participante;
- Programa e etapa;
- tipo: texto, ficheiro, URL ou estruturado;
- conteúdo;
- versão;
- estado: `draft`, `submitted`, `under_review`, `evaluated`, `returned`;
- timestamps;
- autoavaliação;
- feedback;
- avaliação por critério;
- avaliador;
- consentimento de partilha;
- audit trail.

## VWX0-B4 — Generalizar Credencial

Substituir a dependência obrigatória de Curso por alvo polimórfico controlado:

- `curso`
- `programa`
- `simulacao`
- `conquista`

Campos:

- tipo de credencial;
- participante;
- alvo;
- emissor PDC;
- co-emissor opcional;
- competências;
- critérios de emissão;
- duração;
- código de validação;
- URL pública;
- PDF;
- revogadaEm e motivo;
- versão do template.

---

# VWX0-C — Persistência aditiva

Criar collections Strapi:

1. `programa-etapa`
2. `programa-rubrica`
3. `programa-entrega`
4. `credencial` ou migração aditiva de `certificado`
5. `programa-progresso-etapa`
6. `programa-consentimento-partilha`

## Regras

- Sem JSON opaco quando uma relação ou entidade auditável for necessária.
- Usar relações explícitas para Programa, Perfil e Organização.
- Entregas e consentimentos devem suportar histórico e auditoria.
- Índices e unicidade:
  - `(programa, ordem)` único em etapa;
  - `(participante, programa, etapa)` controlado por versão;
  - `codigoValidacao` único em credencial;
  - consentimento ativo único por participante, organização e finalidade.

## Migração

- Não alterar Programas existentes.
- Não converter Experiências Curriculares em VWX.
- Migrar certificados de Curso apenas quando a nova entidade estiver validada.
- Script aditivo, idempotente e reversível quando possível.

---

# VWX0-D — Feature flag, RBAC e linguagem organizacional

## Feature flag

Adicionar `VWX_ENABLED` ao registry canónico.

Comportamento enquanto `false`:

- API rejeita criação `tipo=vwx`, salvo super admin em ambiente de desenvolvimento/teste.
- UI não mostra opção VWX.
- Catálogo não lista VWX.
- schemas de leitura continuam tolerantes para migração e testes.

## RBAC inicial

### Criar e editar VWX

- organização verificada do tipo `empresa`, `ong`, `laboratorio`, `instituto`, `centro_formacao` ou `universidade`;
- mentor verificado apenas quando associado ou autorizado;
- super admin.

### Avaliar entrega

- especialista ou mentor explicitamente associado à VWX;
- gestor da organização apenas se possuir permissão de avaliador;
- super admin para auditoria, não como avaliador por defeito.

### Ver dados

- participante vê os próprios dados;
- organização vê analytics agregados;
- dados individuais apenas com consentimento e finalidade registada;
- moderador vê apenas o necessário para segurança;
- super admin com audit trail.

## Linguagem adaptativa

Não renomear imediatamente a role técnica. Adaptar UI segundo `instituicao.tipo`:

- universidade/escola/instituto → “Instituição de Ensino”;
- empresa → “Empresa” ou “Organização Parceira”;
- ONG/laboratório → label própria;
- navegação futura pode usar `/app/organizacao/*` com redirects das rotas antigas.

---

# VWX0-E — Testes e gates

## Testes de caracterização obrigatórios

1. Experiência Curricular continua a criar, rever, aprovar, publicar e inscrever.
2. Programa standard continua compatível.
3. Organização do tipo empresa continua a registar e ser verificada.
4. Feature flag bloqueia `tipo=vwx` quando desligada.
5. Estados editoriais inválidos falham antes do Strapi.
6. Experiência permanece gratuita sob payload malicioso.
7. Certificados antigos continuam legíveis durante a migração.

## Gates de CI

- typecheck de `shared`, `api` e `web`;
- testes unitários e de integração das rotas alteradas;
- testes Strapi dos lifecycles;
- Playwright mínimo para Experiência Curricular e Programa standard;
- nenhum `any` novo;
- documentação e schema atualizados na mesma PR.

---

# Waves seguintes

## VWX1 — Builder e Player

- builder assistido por etapas;
- preview;
- player com timeline;
- progresso server-side;
- rascunho e submissão;
- desbloqueios;
- debrief;
- conclusão.

## VWX2 — Avaliação, Projeto e Credencial

- rubricas;
- avaliação automática e humana;
- projeto final;
- resposta-modelo;
- credencial verificável;
- integração com Perfil e Portfólio.

## VWX3 — Analytics e Opportunity Pathway

- funil por etapa;
- drop-off;
- dificuldade;
- competências praticadas;
- satisfação;
- consentimento individual;
- opt-in para oportunidades;
- revogação e auditoria.

## VWX4 — Templates e escala

- templates por formato e setor;
- coortes;
- especialistas convidados;
- importação de conteúdos;
- tradução e mercados múltiplos;
- integração com instituições de ensino.

---

# Critério de saída da VWX0

A wave termina apenas quando:

- os seis problemas de integridade estão corrigidos;
- `ADR-054` está aceite e referenciado;
- contratos de VWX, Etapa, Rubrica, Entrega e Credencial existem no SSOT;
- schemas Strapi aditivos existem;
- feature flag e RBAC estão definidos;
- testes de caracterização protegem Experiência Curricular e Programa standard;
- nenhuma funcionalidade VWX incompleta aparece em produção.
