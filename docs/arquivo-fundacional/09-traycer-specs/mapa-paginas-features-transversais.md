# Specs Traycer — Mapa de Páginas e Features Transversais

> **Origem:** `/Documentos/Traycer/` — 2 specs (~82KB total)
> **IDs Traycer:** `c67e1ed4` (Mapa de Páginas, 34KB), `ae07e114` (Features Transversais, 47KB)
> **Data original:** 3 Abril 2026 · **Status:** OURO — detalhes field-level não presentes nas specs/IMPORTANTE/

---

## PARTE A — Mapa Completo de Páginas e Fluxos por Role

### 1. Zonas da Aplicação

| Zona | Sidebar | TopBar | Footer | Acesso |
|------|---------|--------|--------|--------|
| **Pública** | Não | Sim (Login + Criar conta) | Sim | Todos |
| **Estudante/Mentor/Instituição** | Sim (menu por role) | Sim (notificações, perfil) | Não | Auth + role |
| **Moderador/Comité** | Sim (menu restrito) | Sim | Não | Auth + role |
| **Super Admin** | Sidebar admin dedicada | Sim | Não | Auth + super_admin |
| **Auth (login, registo)** | Não | Não | Não | Todos |

### 2. Guards de Autenticação

| Guard | Comportamento |
|-------|---------------|
| `PublicOnly` | Redireciona para dashboard se já autenticado |
| `RequireAuth` | Redireciona para `/login` se não autenticado |
| `RequireRole(roles[])` | Redireciona para `/403` se role não permitido |
| `RequireActive` | Redireciona para `/conta-inativa` se perfil desativado |

### 3. Páginas Públicas (17 rotas)

| Rota | Página |
|------|--------|
| `/` | Landing — hero com desafio vocacional IA, CTAs |
| `/explorar` | Catálogo geral: experiências, cursos, simulações, mentores |
| `/experiencias`, `/experiencias/:id` | Catálogo + detalhe (timeline, depoimentos, bloco IA) |
| `/cursos`, `/cursos/:id` | Catálogo + detalhe (módulos preview, mentor, avaliações) |
| `/simulacoes`, `/simulacoes/:id` | Catálogo + detalhe (critérios, histórico) |
| `/programas`, `/programas/:id` | Catálogo + detalhe (cursos/experiências incluídos) |
| `/projetos`, `/projetos/:id` | Feed de projetos públicos + votação |
| `/mentores` | Catálogo filtrado por área, avaliação, disponibilidade |
| `/instituicoes`, `/instituicoes/:id` | Catálogo + perfil institucional |
| `/perfil/:id` | Perfil público (conquistas, projetos, cursos) |
| `/login`, `/criar-conta/*` | Auth pages |
| `/recuperar-senha`, `/termos`, `/privacidade` | Utilitárias |
| `/404`, `/403`, `/conta-inativa` | Erro |

### 4. Zona Estudante (21 rotas)

**Menu lateral:**
```
Dashboard
Aprendizagem: Meus Cursos, Meu Progresso, Minhas Notas, Certificados, Simulações
Descoberta: Explorar, Experiências, Programas, Mentores
Comunidade: Feed, Projetos, Conquistas, Grupos
Pessoal: Mensagens, Notificações, Calendário, Guardados
Perfil: Meu Perfil, Perfil Vocacional, Definições de Conta
```

**Rotas exclusivas:** `/estudante` (dashboard), `/estudante/meus-cursos`, `/estudante/progresso`, `/estudante/notas`, `/estudante/certificados`, `/estudante/simulacoes`, `/estudante/conquistas`, `/estudante/projetos`, `/estudante/projetos/colaboracao`, `/estudante/ranking`, `/estudante/calendario`, `/perfil/me`, `/perfil/vocacional`, `/definicoes`, `/editar-perfil/aluno`, `/vinculo`, `/mensagens`, `/notificacoes`, `/guardados`, `/feed`, `/grupos`

### 5. Zona Mentor (21 rotas)

**Menu lateral:**
```
Dashboard
Conteúdo: Meus Cursos, Minhas Experiências, Minhas Simulações, Upload
Alunos: Inscritos, Vinculados, Mentorados
Instituições: Instituições vinculadas
Comunidade: Feed, Grupos, Calendário
Analytics, Reputação
Pessoal: Mensagens, Notificações, Vínculos
Perfil: Meu Perfil, Definições de Conta
```

**Fluxo editorial:** Draft → Review (moderador) → Approved → Published (mentor publica) → Catálogo

### 6. Zona Instituição (16 rotas)

**Menu lateral:**
```
Dashboard
Conteúdo: Cursos publicados, Programas e Experiências
Pessoas: Mentores vinculados, Estudantes vinculados
Propostas, Relatórios, Branding, Reputação
Comunidade: Feed, Calendário
Pessoal: Mensagens, Notificações
Perfil
```

**Fluxo proposta directa:** Instituição seleciona estudante vinculado → POST proposta → Notificação → Estudante aceita/recusa

### 7. Zona Moderador

```
Dashboard
Moderação: Fila de Aprovação (cursos, experiências, simulações, programas, projetos)
           Fila de Denúncias
Gestão de Utilizadores: Listagem, Suspensão/Ban
Audit Trail
```

### 8. Zona Comité Científico

```
Dashboard
Revisão Científica: Simulações pendentes, Experiências pendentes
Histórico de Revisões
```

### 9. Zona Super Admin

```
Dashboard
Feature Flags, Gestão de Instituições, Gestão de Utilizadores
Moderação (acesso total), Relatórios globais, Configurações do sistema
```

---

## PARTE B — Features Transversais (Tecido Conjuntivo)

### Princípios Fundamentais

| Princípio | Significado |
|-----------|-------------|
| **Tudo é sinal** | Cada interação alimenta telemetria e perfil vocacional |
| **Separação de contexto** | Avaliação de Curso ≠ Avaliação de Mentor (modelos separados) |
| **Moderação por defeito** | Conteúdo UGC passa por moderação |

### Entidades Alvo (Polimórficas)

```
targetType: 'curso' | 'experiencia' | 'simulacao' | 'programa' | 'projeto' | 'post' | 'conquista' | 'mentor' | 'instituicao'
targetId: number
```

### Feature 1: Curtir (Like)

- **Toggle:** Curtir 2× remove o like
- **Unicidade:** `(actorId, targetType, targetId)` — índice único
- **Sem notificação individual** — apenas resumos periódicos
- **Endpoints:** `POST /interactions/like` (toggle), `GET /interactions/like/count`, `GET /interactions/like/status`
- **Telemetria:** `interaction.like`

### Feature 2: Guardar (Bookmark)

- **Privado** — só o próprio vê
- **Toggle, sem limite**
- **Sinal forte** de intenção vocacional
- **Página dedicada:** `/guardados`
- **Endpoints:** `POST /interactions/bookmark`, `GET /interactions/bookmarks`, `GET /interactions/bookmark/status`

### Feature 3: Comentar

- **3–1000 chars**, texto simples + emojis, sem markdown
- **1 nível de reply** (sem sub-replies)
- **Edição:** até 1h pelo autor
- **Eliminação suave:** `[comentário removido]`
- **Moderação:** contas <7 dias → fila de moderação
- **Rate limit:** 10/min, profundidade max 2 níveis
- **Modelo:** `Comentario { targetType, targetId, autorId, corpo, parentId, estado: pendente|aprovado|removido }`

### Feature 4: Avaliar (Rating 1–5)

- **Uma por utilizador por entidade** (atualizável)
- **Condições de elegibilidade:**
  - Curso: ≥30% completo
  - Experiência: ≥3 blocos visitados
  - Simulação: completada
  - Mentor: ≥1 sessão de mentoria
  - Instituição: ≥30 dias de vínculo
  - Projeto: revisão formal (mentor/comité)
- **Score ponderado** no servidor — mais histórico = mais peso
- **Privacidade:** avaliação pública ou anónima
- **Modelo:** `Rating { targetType, targetId, actorId, score(1-5), comentario?, isPublic, estado }` + `EntityScore { avgScore, totalRatings, distribuicao }`

### Feature 5: Partilhar

- **3 tipos:** Interna (post no feed), Link (clipboard), Externa (Web Share API)
- **URLs públicos** para SEO
- **Contador público** de partilhas

### Feature 6: Denunciar

- **6 categorias:** conteudo_inapropriado, informacao_falsa, spam, plagio, assedio, outro
- **Prioridade automática:** assédio → urgente, inapropriado → alta
- **Threshold:** 3+ denúncias em 24h → auto-hide até revisão
- **Anonimato:** denunciante nunca revelado ao autor
- **Feedback:** denunciante notificado quando resolvida
- **Modelo:** `Denuncia { targetType, targetId, denuncianteId, categoria, descricao, estado, prioridade, moderadorId, resolucao }`

### Feature 7: Telemetria de Comportamento

**Catálogo completo de eventos:**

| Categoria | Eventos | Dados chave |
|-----------|---------|-------------|
| **Conteúdo** | view, scroll_depth (25/50/75/100%), time_spent, video_play/progress/abandon | targetType, targetId, depth, duration |
| **Simulação** | start, question_answer, question_change, pause, abandon, complete | simulacaoId, score, timeToAnswer, isCorrect |
| **Decisão** | area_explore, bookmark, enroll, mentor_connect, institution_connect | area, timeSpent, contentViewed |
| **Interação** | like, comment, share, rating, report | targetType, targetId, actorId |

**Modelo do evento:**
```
TelemetriaEvento {
  eventId (UUID), correlationId, sessionId, actorId, actorRole,
  eventType, targetType, targetId, payload (JSON),
  clientTimestamp, serverTimestamp, userAgent, ipHash (SHA-256)
}
```

**Regras de processamento:**
- Batch: até 20 eventos ou 30s
- Offline-first: fila em IndexedDB
- Deduplicação por eventId UUID
- IP nunca em claro (hash SHA-256)
- Retenção 2 anos, depois anonimização
- Nunca bloqueia UI (assíncrono)

**Pipeline vocacional:**
```
Eventos → Processador de Sinais
  simulation.complete → Aptidão Técnica por Área
  area_explore + time_spent → Motivação Intrínseca
  question_answer + timeToAnswer → Padrão de Decisão
  video_abandon → Pontos de Fricção
→ Perfil Vocacional → Recomendação + Relatório Institucional
```

### Feature 8: Vínculo (Conexão Formal)

**Tipos:** estudante↔mentor, estudante↔instituição, mentor↔instituição

**Estados:** `pendente → aceite → terminado` (ou `rejeitado`)

**Regras:**
- Bilateral: ambas as partes aprovam
- Um vínculo ativo por par (estudante, mentor)
- Instituições podem ter múltiplos vínculos
- Terminação: qualquer parte pode terminar
- Obrigatoriedade: acesso a funcionalidades B2B requer vínculo

### Feature 9: Endorsements / Kudos

- Mentor endossa competência específica de estudante
- Instituição endossa aluno de destaque
- Público no perfil, contribui para reputação

### Feature 10: Project Votes

- Upvote/downvote em projectos
- Pesos contribuem para ranking no feed
- Fork: derivar projecto

---

*Destilado de 2 specs Traycer · IDs: c67e1ed4 (34KB), ae07e114 (47KB)*
*Wireframes HTML omitidos — consultar ficheiros originais em `/Documentos/Traycer/` se necessário.*
