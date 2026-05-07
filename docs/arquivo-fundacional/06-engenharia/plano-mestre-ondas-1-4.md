# Plano Mestre de Execução — Ondas 1 a 4

> **Origem:** `/fv/docs/PDC_v2_—_Plano_Mestre_de_Execução__Ondas_1_a_4.md` (713 linhas, 37KB)
>
> **Propósito:** Plano operacional completo com ~65 rotas, wireframes, triggers de notificação, pipeline do feed, lógica de vínculos, zonas por role, content-types Strapi, e diagramas de fluxo. É o "blueprint" de implementação para as 4 ondas de entrega.
>
> **Status:** OURO — blueprint operacional único que detalha o "como construir" rota a rota

---

## 1. Estado Actual (Snapshot)

| Zona | Implementado | Em falta |
|------|-------------|----------|
| Pública | `/`, `/login`, `/register`, `/forgot-password`, `/experiencias`, `/experiencias/:id` | ~20 rotas públicas |
| Estudante | Dashboard, simulações, cursos, perfil, conquistas, projectos, mentorias | Notas, certificados, ranking, calendário, guardados, perfil vocacional público |
| Moderador | Denúncias (list + detail) | Fila de aprovação de conteúdo, gestão de utilizadores |
| Admin | Utilizadores, stats, audit, LTI | ~12 páginas admin |
| Partilhadas | — | Feed, mensagens, notificações, busca, vínculos, perfil público |
| Mentor | — | Todas as ~15 páginas |
| Instituição | — | Todas as ~12 páginas |
| Comité Científico | — | Todas as páginas |

**Total implementado: ~25 rotas. Total em falta: ~65 rotas.**

---

## 2. Onda 1 — Diferencial do Produto (Semana 1-2)

### 2.1 Micro Desafio Vocacional Completo

O componente `MicroDesafio.tsx` existe mas está simplificado. Features em falta:

| Feature | Descrição |
|---------|-----------|
| **Detecção adaptativa de área** | Campo de texto livre "O que sonhas fazer?" — detecta área por palavras-chave antes de mostrar perguntas |
| **10 áreas com perguntas específicas** | Cada área tem o seu conjunto de perguntas práticas (não 3 genéricas) |
| **Live Pulse** | Feed em tempo real de actividade de outros utilizadores por área (Socket.IO) |
| **Carrossel de instituições** | Instituições parceiras com score de localidade e área |
| **Veredito com arquétipo** | Score + arquétipo + próximo passo + recomendação de 3 simulações |
| **Telemetria completa** | `landing_hero_started`, `landing_hero_area_detected`, `landing_hero_verdict_generated` |

**Fluxo:** Utilizador → Campo livre → Detecção de área → 5 perguntas específicas → POST /tina/chat → Veredito (score + arquétipo) → 3 simulações recomendadas → CTA (criar conta / explorar)

**Ficheiros:** `useMicroDesafio.ts`, `MicroDesafio.tsx`, `LandingPage.tsx`

### 2.2 Catálogos Públicos e Registo por Tipo

| Rota | Componente | Dados |
|------|-----------|-------|
| `/explorar` | `ExplorarPage` | Tabs: Tudo / Experiências / Cursos / Simulações / Mentores / Instituições |
| `/cursos` | `CursosCatalogo` | Grid com filtros (área, nível, idioma, preço) |
| `/cursos/:slug` | `CursoPublicoDetail` | Preview módulos, mentor, avaliações, CTA inscrição |
| `/simulacoes` | `SimulacoesCatalogo` | Grid com filtros (área, tipo, nível) |
| `/simulacoes/:slug` | `SimulacaoPublicoDetail` | Descrição, critérios, CTA executar |
| `/mentores` | `MentoresCatalogo` | Grid com filtros (área, disponibilidade) |
| `/mentores/:id` | `MentorPublicoPerfil` | Bio, cursos, avaliações, botão conectar |
| `/instituicoes` | `InstituicoesCatalogo` | Grid com filtros (tipo, região) |
| `/instituicoes/:slug` | `InstituicaoPublicoPerfil` | Sobre, experiências, programas, mentores |
| `/perfil/:id` | `PerfilPublico` | Perfil de qualquer utilizador |
| `/criar-conta` | `EscolhaTipoConta` | 3 cards: Estudante / Mentor / Instituição |
| `/criar-conta/estudante` | `RegistoEstudante` | Nome, email, password, área, nível |
| `/criar-conta/mentor` | `RegistoMentor` | Nome, email, password, área, upload docs |
| `/criar-conta/instituicao` | `RegistoInstituicao` | Nome, email, password, região, upload docs |

---

## 3. Onda 2 — Zona Estudante Completa (Semana 3-4)

### 3.1 Páginas de Aprendizagem

| Rota | Componente | Prioridade |
|------|-----------|-----------|
| `/estudante/meus-cursos` | `MeusCursosPage` | 🔴 |
| `/estudante/notas` | `MinhasNotasPage` | 🟠 |
| `/estudante/certificados` | `CertificadosPage` | 🟠 |
| `/estudante/ranking` | `RankingPage` | 🟡 |
| `/estudante/calendario` | `CalendarioPage` | 🟡 |
| `/estudante/guardados` | `GuardadosPage` | 🟠 |
| `/perfil/vocacional` | `PerfilVocacionalPublico` | 🔴 |

### 3.2 Editar Perfil por Tipo (não formulário genérico)

| Rota | Campos específicos |
|------|-------------------|
| `/editar-perfil/aluno` | Nome, foto, bio, área de interesse, nível de ensino, região |
| `/editar-perfil/mentor` | Nome, foto, bio, área de especialidade, headline, documentos de validação |
| `/editar-perfil/instituicao` | Nome, logo, capa, descrição, tipo, região, website, contactos |

**Regra crítica para upload de foto:** Após upload para R2:
1. Actualizar campo `foto` no Strapi via `strapiPut`
2. Emitir evento Socket.IO `profile:photo_updated` com `{ perfilId, newUrl }`
3. Frontend invalida `queryClient.invalidateQueries(['perfil', perfilId])` globalmente
4. Todos os componentes `Avatar` com esse `perfilId` actualizam via React Query

### 3.3 Definições de Conta

| Rota | Secções |
|------|---------|
| `/definicoes` | Email, password, notificações (por categoria), privacidade, eliminar conta |

### 3.4 Discussões em Cursos

| Rota | Descrição |
|------|-----------|
| `/curso/:id/discussoes` | Fórum do curso — threads por módulo, ordenados por actividade |
| `/curso/:id/discussoes/:threadId` | Thread individual com respostas |

**Modelo de dados:** Usa content-type `comentario` polimórfico com `targetType: 'modulo'` e `targetId: moduloId`.

---

## 4. Onda 3 — Features Transversais (Semana 5-6)

### 4.1 Motor de Notificações — Tabela de Triggers

| Acção | Receptor | Canal | Agrupamento |
|-------|----------|-------|-------------|
| Like no conteúdo | Autor do conteúdo | In-app | Sim — "X pessoas curtiram" (semanal) |
| Comentário no conteúdo | Autor do conteúdo | In-app + email | Não — imediato |
| Partilha de conteúdo | Autor do conteúdo | In-app | Sim — resumo diário |
| Pedido de vínculo recebido | Destinatário | In-app + email | Não — imediato |
| Pedido de vínculo aceite | Solicitante | In-app | Não — imediato |
| Pedido de vínculo rejeitado | Solicitante | In-app | Não — imediato |
| Proposta institucional recebida | Estudante | In-app + email | Não — imediato |
| Conteúdo aprovado pelo moderador | Autor | In-app + email | Não — imediato |
| Conteúdo rejeitado pelo moderador | Autor | In-app + email | Não — imediato (com motivo) |
| Conquista aprovada | Autor | In-app | Não — imediato |
| Denúncia resolvida | Denunciante | In-app | Não — imediato |
| Nova discussão no curso | Inscritos | In-app | Sim — máx. 1/dia por curso |
| Mentor corrigiu tarefa | Aluno | In-app + email | Não — imediato |
| Novo aluno inscrito | Mentor/Instituição | In-app | Sim — resumo diário |
| Anúncio do sistema | Todos | In-app | Não |

**Implementação:** BFF `notification.service.ts` chamado após cada acção relevante. Nunca é o Strapi a gerar notificações.

### 4.2 Feed Global — Pipeline do Algoritmo

**Endpoint:** `GET /feed?tipo=geral|vocacional|institucional|trending&page=1&area=tecnologia`

**Pipeline BFF:**
1. **Geração de candidatos** — busca ~500 itens do Strapi por fonte (in-network, área, trending, novo)
2. **Hidratação** — para cada candidato, busca scores do Redis (entity_score, author_reputation)
3. **Scoring** — aplica fórmula com pesos por tipo de feed
4. **Filtragem** — remove conteúdo já visto, do próprio utilizador, de perfis bloqueados
5. **Mixing** — injeta sugestões de mentores (posição 5), conquistas (posição 15), programas (posição 25)
6. **Cache** — resultado no Redis com TTL 15min por utilizador

**Rotas:**

| Rota | Componente |
|------|-----------|
| `/feed` | `FeedPage` com tabs: Para Ti / Explorar / Minha Instituição / Em Alta |
| `/feed/:type/:id` | `FeedItemDetail` — post ou conquista com comentários |
| `/postar` | `CriarPostPage` — formulário de publicação |

### 4.3 Interacções Transversais — ActionBar

Componente `ActionBar` aparece em todos os cards e páginas de detalhe:

```typescript
interface ActionBarProps {
  targetType: 'curso' | 'simulacao' | 'experiencia' | 'projeto' | 'post' | 'conquista'
  targetId: string
  counts: { likes: number, comentarios: number, bookmarks: number }
  userState: { liked: boolean, bookmarked: boolean }
  showReport?: boolean
  showRating?: boolean
}
```

**BFF — rotas de interacções:**

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/interacoes/like` | Toggle like |
| POST | `/interacoes/bookmark` | Toggle bookmark |
| GET | `/interacoes/counts/:tipo/:id` | Contadores |
| GET | `/interacoes/user-state/:tipo/:id` | Estado do utilizador |
| POST | `/interacoes/rating` | Avaliar (só após consumir) |
| GET | `/interacoes/share/:tipo/:id` | Gerar link partilhável |
| POST | `/comentarios` | Criar comentário |
| GET | `/comentarios?targetType=X&targetId=Y` | Listar comentários |
| DELETE | `/comentarios/:id` | Remover (autor ou moderador) |

### 4.4 Vínculos (Conexões)

| Rota | Componente |
|------|-----------|
| `/vinculo` | `VinculosPage` — pedidos recebidos/enviados, conexões activas |

**BFF — rotas:**

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/vinculos` | Pedir vínculo |
| GET | `/vinculos?perfilId=X` | Listar vínculos de um perfil |
| GET | `/vinculos/pendentes` | Pedidos pendentes recebidos |
| PATCH | `/vinculos/:id` | Aceitar ou rejeitar |
| DELETE | `/vinculos/:id` | Remover vínculo |
| GET | `/vinculos/status?targetId=Y` | Estado com outro perfil |

**Regras de negócio:**
- Máximo **5 mentores activos** por estudante
- Vínculo rejeitado pode ser re-pedido após **30 dias**
- Proposta institucional = vínculo iniciado pela instituição

### 4.5 Busca, Mensagens e Páginas Legais

| Rota | Componente |
|------|-----------|
| `/busca` | `BuscaPage` — resultados agrupados por tipo com ranking |
| `/mensagens` | `MensagensPage` — inbox com conversas em tempo real |
| `/mensagens/:conversaId` | `ConversaPage` — chat com estados de entrega |
| `/notificacoes` | `NotificacoesPage` — centro com filtros |
| `/guardados` | `GuardadosPage` — conteúdo guardado por categoria |
| `/termos` | `TermosPage` |
| `/privacidade` | `PrivacidadePage` |
| `/403` | `SemPermissaoPage` |
| `/conta-inativa` | `ContaInativaPage` |

**Mensagens — estados de entrega:** Enviada → Entregue (Socket.IO confirma) → Lida (destinatário abre conversa)

---

## 5. Onda 4 — Zonas de Criação e Gestão (Semana 7-9)

### 5.1 Princípios de Formulários de Criação

| Princípio | Implementação |
|-----------|--------------|
| **Auto-save** | Debounce 2s — rascunho no Strapi automaticamente |
| **Pré-visualização** | Botão mostra como ficará para o utilizador final |
| **Upload progressivo** | Barra de progresso + cancelamento |
| **Validação em camadas** | Zod no cliente (feedback) + Zod no BFF (segurança) |
| **Estado editorial** | Badge (Rascunho / Em Revisão / Aprovado / Publicado) sempre visível |
| **Saída segura** | Aviso "Tens alterações não guardadas" |

### 5.2 Zona Mentor (12 rotas)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/mentor` | `MentorDashboard` | KPIs: alunos, cursos, receita, alertas de risco |
| `/mentor/cursos` | `MentorCursosPage` | Lista com estado editorial e métricas |
| `/mentor/cursos/criar` | `CriarCursoPage` | Formulário completo |
| `/mentor/cursos/:id/editar` | `EditarCursoPage` | Edição com módulos e itens |
| `/mentor/cursos/:id/modulos/:moduloId` | `EditarModuloPage` | Gestão de itens |
| `/mentor/simulacoes` | `MentorSimulacoesPage` | Simulações criadas |
| `/mentor/simulacoes/criar` | `CriarSimulacaoPage` | Formulário de simulação |
| `/mentor/upload` | `UploadConteudoPage` | Upload de vídeos e PDFs para R2 |
| `/mentor/alunos/inscritos` | `AlunosInscritosPage` | Alunos com progresso por curso |
| `/mentor/mentorados` | `MentoradosPage` | Com alertas de risco de evasão |
| `/mentor/analytics` | `MentorAnalyticsPage` | Conclusão, notas, evasão por curso |
| `/mentor/reputacao` | `MentorReputacaoPage` | Avaliações recebidas |

**Lógica de publicação:** draft → review → draft (rejeitado) / approved → published → archived → draft (reactivado)

### 5.3 Zona Instituição (8 rotas)

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/instituicao` | `InstituicaoDashboard` | KPIs: alunos, evasão, engajamento |
| `/instituicao/criar-experiencia` | `CriarExperienciaPage` | Formulário de experiência |
| `/instituicao/criar-programa` | `CriarProgramaPage` | Inclui ShadowApro e EduVisit |
| `/instituicao/programas` | `InstituicaoProgramasPage` | Programas e experiências com estado |
| `/instituicao/estudantes-vinculados` | `EstudantesVinculadosPage` | Estudantes com proposta directa |
| `/instituicao/propostas` | `PropostasPage` | Propostas enviadas e recebidas |
| `/instituicao/relatorios` | `RelatoriosPage` | Dashboard métricas evasão |
| `/instituicao/branding` | `BrandingPage` | Logo, cores, textos da página pública |

**Tipos especiais de Programa:**

| Tipo | Lógica |
|------|--------|
| **ShadowApro** | Matching estudante↔profissional por área. Agendamento de dia de shadowing. Feedback pós-experiência. Telemetria `shadowapro.completed` |
| **EduVisit** | Inscrição com confirmação pela instituição. Visita virtual (iframe) ou presencial. Relatório pós-visita. Telemetria `eduvisit.completed` |

### 5.4 Zona Moderador — Fila de Aprovação

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/moderador` | `ModeradorDashboard` | Fila de aprovação + denúncias pendentes |
| `/moderador/aprovacoes` | `FilaAprovacaoPage` | Tabs: Cursos / Experiências / Simulações / Conquistas |
| `/moderador/aprovacoes/:tipo/:id` | `DetalheAprovacaoPage` | Aprovar/Rejeitar + motivo |

### 5.5 Zona Comité Científico

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/comite-cientifico` | `ComiteDashboard` | Simulações e conquistas pendentes |
| `/comite-cientifico/validacao` | `ValidacaoCientificaPage` | Filtros, marcar validado com comentário |

### 5.6 Zona Admin — Páginas em Falta

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin/estatisticas` | `AdminEstatisticasPage` | Gráficos crescimento, retenção, uso |
| `/admin/telemetria` | `AdminTelemetriaPage` | Eventos, funis, drop-offs |
| `/admin/presence` | `AdminPresencaPage` | Utilizadores activos realtime |
| `/admin/instituicoes-pendentes` | `InstituicoesPendentesPage` | Aprovação de novas instituições |
| `/admin/mentores-pendentes` | `MentoresPendentesPage` | Aprovação de novos mentores |
| `/admin/funcionalidades` | `FeatureFlagsPage` | Activar/desactivar por role |

---

## 6. Strapi — Novos Content-Types

| Content-Type | Prioridade | Onda |
|-------------|-----------|------|
| `like` | 🔴 | Onda 3 |
| `bookmark` | 🔴 | Onda 3 |
| `comentario` (polimórfico) | 🔴 | Onda 3 |
| `avaliacao` | 🟠 | Onda 3 |
| `partilha` | 🟡 | Onda 3 |
| `voto-projeto` | 🟠 | Onda 3 |
| `subscricao` | 🟡 | Onda 4 |
| `entity_score` (cache de scores) | 🔴 | Onda 3 |

---

## 7. Estimativa e Divisão de Trabalho

| Onda | Semanas | Foco |
|------|---------|------|
| **Onda 1** — Diferencial do produto | 1-2 | Micro Desafio completo + Catálogos públicos + Registo por tipo |
| **Onda 2** — Zona estudante completa | 3-4 | Aprendizagem + Perfil por tipo + Definições + Discussões |
| **Onda 3** — Features transversais | 5-6 | Notificações + Feed + Interacções + Vínculos + Busca + Mensagens |
| **Onda 4** — Zonas de criação e gestão | 7-9 | Mentor + Instituição + Moderador + Comité + Admin |

**Total: ~9 semanas.**

---

*Destilado de `/fv/docs/PDC_v2_—_Plano_Mestre_de_Execução__Ondas_1_a_4.md` (713 linhas) · Abril 2026*
*Nota: O original contém wireframes HTML interactivos que podem ser consultados para referência visual.*
