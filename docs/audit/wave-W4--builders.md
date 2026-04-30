# Audit · Wave W4 — Builders

> **Metodologia:** D1 (Filtro de Visão por camada: `IMPORTANTE/04 §3.1-§3.6` + `IMPORTANTE/05 §4`) · D2 (taxonomia) · D6 (schema evidência) · D8 (estrutura wave-spec) · D13 (cascata obrigatória: T-AUD-1, T-AUD-2, T-AUD-3 lidos) · D14 estrito para Projeto Core frontend
> **Escopo:** 8 tickets-fonte W4.1–W4.8
> **Cascata D13:** T-AUD-3 concluído:
> - W3.1 Programa = Done → W4.6 pode ser auditado normalmente
> - W3.2 Projeto = Done → W4.7 pode ser auditado normalmente
> - W3.3 Simulação = Done → W4.5 pode ser auditado normalmente
> - W3.4 Experiência = Done-Plus → W4.4 pode ser auditado normalmente
> - W3.5 Feed-Post = Partial (BFF stub) → W4.8 PostComposer herda limitação
> - W3.6 Conquista = Done → W4.8 ConquistaComposer pode ser auditado
> **Auditoria:** estática — nenhum ficheiro de código modificado.

---

## 1. Sumário da Wave

| Ticket | Tema | Veredicto global |
|--------|------|-----------------|
| W4.1 | BuilderShell + BuilderSection (H8) | **Done** |
| W4.2 | BuilderActionsBar + EditorialStateBadge + BuilderUploadZone (H8) | **Partial** |
| W4.3 | Curso: migração para BuilderShell (SovereignCourseBuilder) | **Done** |
| W4.4 | Experiência: builder Full-Spec 4 painéis | **Done** |
| W4.5 | Simulação: builder Full-Spec + critérios + materiais + tipoLab | **Done-Plus** |
| W4.6 | Programa: builder Full-Spec 4 secções | **Done** |
| W4.7 | Projeto: builder camadas Pública/Core + 4 modos + ACL | **Done** |
| W4.8 | Post composer + Conquista manual composer | **Partial** |

**Contagens:**

| Done | Done-Plus | Partial | Missing | Drift-Ticket | Drift-Constitution | Vision-Failure | Cannot-Verify |
|------|-----------|---------|---------|-------------|-------------------|----------------|---------------|
| 5 | 1 | 2 | 0 | 0 | 0 | 0 | 0 |

---

## 2. Veredicto sobre o Directório `apps/web/src/components/builders/`

```
Veredicto: Presente — directório existe e contém 5 ficheiros.
Evidência:
  apps/web/src/components/builders/
    BuilderShell.tsx     (100 linhas)
    BuilderSection.tsx   (22 linhas)
    BuilderActionsBar.tsx (59 linhas)
    BuilderUploadZone.tsx (69 linhas)
    index.tsx            (5 linhas — re-exports dos 4 primitivos)

  apps/web/src/components/ui/EditorialStateBadge.tsx — presente mas fora do
  directório builders/ (localizado em components/ui/).
```

A Análise §5.3 declarou o directório como ausente — **gap FECHADO** pela implementação.
`EditorialStateBadge` existe mas vive em `components/ui/` e não em `components/builders/`.

---

## 3. Auditoria por Ticket (schema D6)

### W4.1 — BuilderShell + BuilderSection (H8 primitivos)

**Cascata D13:** Nenhum schema W3 em falta — pré-condição cumprida.

**AC W4.1.1 — `BuilderShell` existe com props `title`, `description`, `actions`, `children`, `breadcrumbs`, `sections`, `state`.**

```
Veredicto: Done
Evidência:
  file:apps/web/src/components/builders/BuilderShell.tsx L16-24 —
    interface BuilderShellProps {
      title: string;
      description: string;
      actions: React.ReactNode;
      children: React.ReactNode;
      breadcrumbs?: Breadcrumb[];
      sections?: Section[];
      state?: string;
    }
  Todas as props declaradas. Layout: 12 colunas (col-span-8 conteúdo + col-span-4
  actions) com navegação por secções e scroll-spy.
Lacuna: `ProjetoFormPage` passa `form` como prop (L105) mas `BuilderShellProps`
  não declara `form`. TypeScript tolerará se o componente ignora props extras —
  mas é um contrato não-declarado. Baixo risco.
```

**AC W4.1.2 — `BuilderSection` existe com props `title`, `description`, `children`, `value`.**

```
Veredicto: Done
Evidência:
  file:apps/web/src/components/builders/BuilderSection.tsx L3-8 —
    interface BuilderSectionProps {
      title: string; description: string; children: React.ReactNode; value: string;
    }
  Todas as props declaradas. Prop `value` anotada como "identificador técnico
  para âncora/navegação" (linha 7). Funciona como id para `scrollToSection`.
Lacuna: `value` é declarado como obrigatório na interface mas os builders
  usam-na de forma inconsistente — alguns `BuilderSection` omitem `value`
  (ex.: `CriarProgramaPage` L92, `CriarExperienciaPage` L146).
  TypeScript irá reportar erro de compilação para cada omissão — drift de
  assinatura vs uso.
```

> **Veredicto global W4.1: Done** — ambos os primitivos implementados. `value` obrigatório no `BuilderSection` mas ausente em vários usos é um bug de assinatura (não Vision-Failure).

---

### W4.2 — BuilderActionsBar + EditorialStateBadge + BuilderUploadZone (H8 primitivos)

**AC W4.2.1 — `BuilderActionsBar` com workflow editorial (draft → review → approved → published).**

```
Veredicto: Done
Evidência:
  file:apps/web/src/components/builders/BuilderActionsBar.tsx —
  - Props: isSubmitting, onSaveDraft, state, userRole, onSubmitReview, onPublish.
  - Botão "Salvar Rascunho" sempre visível.
  - Botão "Submeter para Revisão" condicional: state === 'draft' && onSubmitReview.
  - Botão "Publicar Agora" condicional: state === 'approved' && onPublish.
  Máquina de estados editorial implementada correctamente.
Lacuna: `userRole` está na interface mas não é usado no corpo do componente
  (nenhum `if (userRole === ...)` na implementação). A prop existe mas não produz
  efeito — pode ser intenção futura ou dead prop.
```

**AC W4.2.2 — `EditorialStateBadge` com os 5 estados canónicos.**

```
Veredicto: Partial
Evidência:
  file:apps/web/src/components/ui/EditorialStateBadge.tsx L3 —
    type EditorialState = 'rascunho' | 'pendente' | 'publicado' | 'rejeitado' | 'arquivado';
  5 estados presentes. Visual correcto (cores por estado).
  
  Problema 1 — Localização: componente vive em components/ui/EditorialStateBadge.tsx,
  NÃO em components/builders/. Não está exportado pelo barrel index.tsx de builders.
  
  Problema 2 — Alinhamento de vocabulário: os builders passam estado em inglês
  (state='draft', 'approved', 'review', 'published') mas EditorialStateBadge
  espera português ('rascunho', 'pendente', 'publicado', 'rejeitado', 'arquivado').
  BuilderShell e BuilderActionsBar exibem o estado directamente como string sem
  passar por EditorialStateBadge — os dois componentes são independentes e não
  integrados.
  
  Nenhum builder W4.3-W4.7 importa EditorialStateBadge.
Lacuna: EditorialStateBadge nunca é consumido pelos builders. Existe como
  componente isolado mas não está integrado na família Builder.
```

**AC W4.2.3 — `BuilderUploadZone` com upload, múltiplos ficheiros e URL preview.**

```
Veredicto: Done
Evidência:
  file:apps/web/src/components/builders/BuilderUploadZone.tsx —
  - Props: onUploadComplete(urls: string[]), multiple?.
  - Usa blob URLs (URL.createObjectURL) e limpa com revokeObjectURL ao desmontar.
  - Acessibilidade: role="button", tabIndex, onKeyDown (Enter/Space), aria-label.
  - Input file com multiple prop.
Lacuna: URL preview visual não implementado — após upload o utilizador vê
  apenas o texto "Clique para carregar ficheiros". Não há thumbnail/listagem
  dos ficheiros seleccionados. Funcional mas sem feedback visual.
```

> **Veredicto global W4.2: Partial** — `BuilderActionsBar` e `BuilderUploadZone` = Done. `EditorialStateBadge` existe mas em localização errada, com vocabulário desalinhado (inglês vs português) e nunca integrado nos builders.

---

### W4.3 — Curso: migração `SovereignCourseBuilder` para BuilderShell

**Cascata D13:** Zod `CriarCursoPayloadSchema` (schemas não auditados em W3 — Curso está fora do escopo W3 de 7 content-types, mas o BFF existe). Pré-condição: builder existe e importa schema.

```
Veredicto: Done
Evidência:
  file:apps/web/src/features/instituicao/SovereignCourseBuilder.tsx L13 —
    import { BuilderShell, BuilderSection, BuilderActionsBar } from '@/components/builders';
  Migração para primitivos canónicos confirmada.
  
  3 secções implementadas:
    - "Identidade do Curso" (id=info) → CourseBaseInfo + capa upload
    - "Regras de Mérito" (id=merit) → CourseMeritGuard (regras biomecânicas)
    - "Currículo Soberano" (id=curriculum) → CourseCurriculum (módulos + itens)
  
  BuilderActionsBar com workflow editorial integrado.
  EcosystemImpactPanel integrado com AnimatePresence após submit.
  zodResolver(CriarCursoPayloadSchema) — validação Zod activa.
  useMutation → http.post('/cursos') — integração BFF.
Lacuna: `BuilderUploadZone` não é importado directamente — capa delegada
  a `CourseBaseInfo` (que pode ter o seu próprio upload).
```

---

### W4.4 — Experiência: builder Full-Spec com 4 painéis

**Cascata D13:** W3.4 = Done-Plus — schema Strapi completo, `CriarExperienciaPayloadSchema` funcional.

```
Veredicto: Done
Evidência:
  file:apps/web/src/features/instituicao/CriarExperienciaPage.tsx —
  
  4 painéis (BuilderSections):
    1. "Identidade e Contexto" (id=identidade) — título, descricao, area, nivel
    2. "Painel de Realidade" — salarioMedio, taxaEmpregabilidade, empregadores
    3. "Mural de Vozes" — depoimentos (useFieldArray)
    4. "Guia Institucional" — fotosCampus (BuilderUploadZone) + timelineCurricular
  
  Spec IMPORTANTE/04 declara 3 painéis (Painel de Realidade, Mural de Vozes,
  Guia Institucional) + identidade base. 4 painéis implementados = completo.
  
  Autosave com localStorage (STORAGE_KEY).
  zodResolver(CriarExperienciaPayloadSchema).
  useMutation → experienciasApi.create.
  EcosystemImpactPanel integrado.
  BuilderUploadZone usado para fotosCampus.
Lacuna: "Painel de Realidade" — configuração de "Principais Empregadores" é
  um placeholder ("Configuração de marcas parceiras em breve").
```

---

### W4.5 — Simulação: builder Full-Spec + critérios + materiais + tipoLab

**Cascata D13:** W3.3 = Done — `criteriosAvaliacao`, `materiaisLab`, `tipoLab` todos no schema Strapi e no Zod `CriarSimulacaoPayloadSchema`.

```
Veredicto: Done-Plus
Evidência:
  file:apps/web/src/features/mentor/CriarSimulacaoPage.tsx —
  
  3 secções BuilderSection:
    1. "Identidade do Laboratório" (id=identidade) — titulo, descricao, area, tipoLab
    2. "Setup do Laboratório" (id=setup) — tipo motor, tentativasMaximas,
       iframeUrl (condicional tipo=2), materiais (BuilderUploadZone + fieldArray)
    3. "Critérios de Avaliação" (id=criteria) — sliders fluidez/resiliência/foco
       com validação visual de soma=100%
  
  Done-Plus porque:
  - Suporta CREATE e EDIT (parâmetro :id via useParams + isEditing flag).
  - Cria nova simulação E edita existente — funcionalidade além do declarado.
  - stateMutation para transições de estado editorial (review → published).
  - Soma visual dos pesos (verde se =100%, vermelho caso contrário) — UX premium.
  - zodResolver(CriarSimulacaoPayloadSchema).
  - EcosystemImpactPanel integrado.
```

---

### W4.6 — Programa: builder Full-Spec com 5 elementos canónicos

**Cascata D13:** W3.1 = Done — 27 campos Strapi + Zod `CriarProgramaPayloadSchema` completo.

```
Veredicto: Done
Evidência:
  file:apps/web/src/features/instituicao/CriarProgramaPage.tsx —
  
  4 secções BuilderSection:
    1. "Propósito e Identidade" (id=proposito) — titulo, proposito, area, tipo
    2. "Metodologia e Recursos" (id=metodologia) — metodologia (placeholder para recursos JSON)
    3. "Conteúdos Agrupados" — cursosIds, simulacoesIds (placeholder "próxima iteração")
    4. "Regras de Inscrição e Preço" (id=inscricao) — modalidade, vagas, precoPolicy placeholder
  
  5 elementos canónicos Spec IMPORTANTE/04 §3.5:
    proposito ✅, metodologia ✅, conteudos ✅, inscricao ✅, precoPolicy ✅
  
  zodResolver(CriarProgramaPayloadSchema).
  useMutation → programasApi.create.
  EcosystemImpactPanel integrado.
Lacuna: "Conteúdos Agrupados" (cursosIds, simulacoesIds, experienciasIds, projetosIds)
  é um placeholder — o seletor multi-conteúdo não está implementado.
  "Recursos Didáticos" e "Política de Preços" também são placeholders.
  Funcional para criar, mas sem o UI de selecção de conteúdos associados.
```

---

### W4.7 — Projeto: builder camadas Pública/Core + 4 modos + ACL

**Cascata D13:** W3.2 = Done — field-level filtering `core` confirmado no BFF.

**AC W4.7 especial — D14 frontend não deve renderizar `core` para viewers não-autorizados:**

```
Veredicto: Done — NÃO viola D14.
Evidência:
  file:apps/web/src/features/projetos/ProjetoFormPage.tsx — é uma página de
  EDITOR (criação/edição), NÃO de visualização. O utilizador autenticado que
  abre esta página é o AUTOR ou alguém com permissão explícita. O `core` é
  renderizado num textarea para edição (L183) — correcto para o contexto.
  
  O filtro server-side está no BFF (W3.2 = Done). A página de visualização
  pública não expõe `core` — a lista e o detail chamam o BFF que aplica
  `filterCoreField`. O builder é uma rota privada (autenticada).
  
  Portanto: o frontend NÃO expõe core a viewers não autorizados. D14 = cumprido.

Evidência do builder:
  file:apps/web/src/features/projetos/ProjetoFormPage.tsx —
  
  6 secções BuilderSection (create) / 7 secções (edit):
    1. "Identidade do Ativo" — titulo, area, visibilidade
    2. "Pitch Público (Abstract)" — abstract + capa upload (BuilderUploadZone)
    3. "Núcleo Técnico (Core)" — textarea com visual protegido (Lock icon,
       border-institutional-cobalt, "Camada Protegida")
    4. "Modos de Atuação" — checkboxes exposicao, colaboracao, mentoria, financiamento
    5. "Gestão de Acessos (ACL)" — apenas em modo edit (isEdit=true), lista de
       pedidos de acesso com aprovar/rejeitar
    6. "Repositórios e Tags" — repoUrl, demoUrl, seletor de tags (placeholder)
  
  4 modos implementados: exposicao, colaboracao, mentoria, financiamento.
  Nota: feedbackComunitario (5º modo do Zod) não tem checkbox — Drift-Ticket menor.
  
  zodResolver(CriarProjetoPayloadSchema).
  aclMutation → projetosApi.gerirACL (aprovar/rejeitar).
  EcosystemImpactPanel integrado.
```

---

### W4.8 — Post composer + Conquista manual composer

**Cascata D13:** W3.5 Feed-Post = Partial (BFF stub). W3.6 Conquista = Done.

**AC W4.8.1 — `PostComposer` como builder funcional em `/app/feed/criar`.**

```
Veredicto: Partial
Evidência:
  file:apps/web/src/features/feed/PostComposer.tsx L1 —
    // FIXME: STUB AGENT-GENERATED — shell mínima navegável sem lógica de domínio
  
  Rota `/app/feed/criar` registada em router.tsx L163 — navegação funcional.
  
  Implementação: página com header + `AspirationalEmpty` ("Publicação em breve").
  Sem formulário, sem Zod, sem useMutation, sem integração BFF.
  Stub auto-declarado.
  
Cascata: W3.5 (BFF stub) + W4.8 (composer stub) = dívida dupla para posts.
```

**AC W4.8.2 — `ConquistaManualComposer` como builder funcional em `/app/conquistas/criar`.**

```
Veredicto: Partial
Evidência:
  file:apps/web/src/features/conquistas/ConquistaManualComposer.tsx L1 —
    // FIXME: STUB AGENT-GENERATED — shell mínima navegável sem lógica de domínio
  
  Rota `/app/conquistas/criar` registada em router.tsx L185 — navegação funcional.
  
  Implementação: página com header + `AspirationalEmpty` ("Registo manual em breve").
  Sem formulário, sem zodResolver(CriarConquistaManualPayloadSchema), sem useMutation.
  Stub auto-declarado.
  
Nota positiva: usa `AspirationalEmpty` correctamente (D1 camada IMPORTANTE/05 ✅).
Nota: o BFF `POST /conquistas/manual` existe e está completo (W3.6 = Done).
  O stub frontend é a única barreira para esta feature funcionar end-to-end.
```

> **Veredicto global W4.8: Partial** — rotas registadas, navegação funcional, mas ambos os composers são stubs FIXME sem formulário/validação/mutação.

---

## 4. Tabela de Primitivos Canónicos por Builder

> AC 6 do ticket: contagem de imports de `BentoGrid`, `GlassCard`, `AsymmetricButton`, `EditorialStateBadge` por builder.

| Builder | `BuilderShell` | `BuilderSection` | `BuilderActionsBar` | `BuilderUploadZone` | `EditorialStateBadge` | `BentoGrid` | `GlassCard` | `AsymmetricButton` | `EcosystemImpactPanel` |
|---------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| SovereignCourseBuilder (W4.3) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CriarExperienciaPage (W4.4) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CriarSimulacaoPage (W4.5) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| CriarProgramaPage (W4.6) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| ProjetoFormPage (W4.7) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| PostComposer (W4.8) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ConquistaManualComposer (W4.8) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Observações:**
- `EditorialStateBadge` **zero usos** em qualquer builder — componente existe mas nunca importado.
- `BentoGrid`, `GlassCard`, `AsymmetricButton` — **zero usos** em qualquer builder.
- `EcosystemImpactPanel` usado em todos os 5 builders funcionais (W4.3-W4.7).
- Os 2 stubs (W4.8) não usam nenhum primitivo.

---

## 5. Cross-Cutting Findings

### CCF-W4-1 — `EditorialStateBadge` desintegrado dos builders

`EditorialStateBadge` existe em `components/ui/` mas: (a) não está no barrel `builders/index.tsx`; (b) nenhum builder o importa; (c) usa vocabulário português mas `BuilderShell`/`BuilderActionsBar` exibem estado em inglês (`state = 'draft'`). Há um mismatch de idioma que impede a integração directa.

### CCF-W4-2 — `BuilderSection.value` obrigatório mas frequentemente omitido

`BuilderSectionProps` declara `value: string` (obrigatório, não `value?: string`). Vários `BuilderSection` nos builders omitem esta prop. Compilação TypeScript irá reportar erros. Deve ser `value?: string` na interface ou todos os usos devem passar o prop.

### CCF-W4-3 — `ProjetoFormPage` passa `form` como prop a `BuilderShell`

`BuilderShell.tsx` L104: `<BuilderShell form={form} ...>`. `BuilderShellProps` não declara `form`. TypeScript irá reportar erro se strict. Não afecta runtime mas é contrato incorrecto.

### CCF-W4-4 — `feedbackComunitario` ausente nos checkboxes do ProjetoFormPage

`ProjetoFormPage` lista 4 modos: `exposicao, colaboracao, mentoria, financiamento`. O Zod `ProjetoModoSchema` declara 5: inclui `feedbackComunitario`. O 5º modo não tem checkbox — Drift-Ticket herdado de W3.2 (T-AUD-3 CCF-W3-2).

### CCF-W4-5 — Dívida dupla feed: W3.5 BFF stub + W4.8 PostComposer stub

A rota `/app/feed/criar` está registada e navegável. O content-type Strapi `feed-post` está completo. Mas tanto o BFF (`feed-posts.ts`) como o composer (`PostComposer.tsx`) são stubs FIXME. A feature de publicação de posts está bloqueada em ambas as camadas.

### CCF-W4-6 — Seletores de conteúdo em `CriarProgramaPage` são placeholders

A secção "Conteúdos Agrupados" de `CriarProgramaPage` não implementa a selecção de `cursosIds`, `simulacoesIds`, `experienciasIds`, `projetosIds` — apenas exibe contadores. O campo `Recursos Didáticos` e a `precoPolicy` também são placeholders. O programa pode ser criado sem conteúdos associados.

---

## 6. Recomendação de Remediação

| Prioridade | Item | Ticket alvo |
|-----------|------|-------------|
| **Alta** | Implementar `PostComposer.tsx` com formulário `CriarPostPayloadSchema` + `useMutation` → `POST /feed-posts` | W4.8 + W3.5 |
| **Alta** | Implementar `ConquistaManualComposer.tsx` com `CriarConquistaManualPayloadSchema` + `useMutation` → `POST /conquistas/manual` | W4.8 |
| **Alta** | Corrigir `BuilderSection.value` de obrigatório → opcional (`value?: string`) | CCF-W4-2 |
| **Média** | Integrar `EditorialStateBadge` nos builders — ou normalizar vocabulário (inglês vs português) | CCF-W4-1 |
| **Média** | Remover prop `form` passada a `BuilderShell` em `ProjetoFormPage` (CCF-W4-3) | CCF-W4-3 |
| **Baixa** | Adicionar checkbox `feedbackComunitario` em `ProjetoFormPage` (5º modo Zod) | CCF-W4-4 |
| **Baixa** | Implementar seletor de conteúdos em `CriarProgramaPage` (cursosIds, etc.) | CCF-W4-6 |

---

*Produzido por auditoria estática conforme T-AUD-4. T-AUD-1, T-AUD-2, T-AUD-3 consultados (D13 cascata). Nenhum ficheiro de código modificado.*
*`git status` em `pdc-v2/` deve estar limpo após esta auditoria.*
