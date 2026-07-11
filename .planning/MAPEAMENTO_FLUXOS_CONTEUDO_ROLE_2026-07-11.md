# Mapeamento de Fluxos Conteudo x Role — PDC v2

> Data: 11 de Julho de 2026
> Branch: `feat/migrate-bff-cms-to-hetzner`
> Metodo: revisao manual dos fluxos de conteudo, RBAC, privacidade, deploy e achados CodeRabbit recuperados.
> Estado: P0 remediados nesta branch; P1/P2 abaixo ficam rastreados para slices posteriores.

---

## 0. Estado Executivo

Esta branch estava sobrecarregada e misturava infra, seguranca, RBAC, perfil institucional, videos/R2 e hooks.
Antes de abrir PR, foram corrigidos os bloqueadores P0 confirmados na revisao:

- PII em estudantes vinculados: `GET /perfis/estudantes-vinculados` deixou de devolver `/users` cru e passou a devolver perfil publico serializado.
- Oraculo/telemetria: `GET /telemetria/patterns?perfilId=X` exige proprio perfil, `super_admin`, ou mentor com vinculo `student-mentor` aprovado.
- Feed posts: `moderador` e `comite_cientifico` removidos de publicar/editar posts.
- Conquistas manuais: `estudante` mapeia para `tipoAutor=aluno`; `super_admin` mapeia para `tipoAutor=plataforma`.
- Suspensao de utilizador: acao agora escreve audit log.
- Deploy VPS: verificado que `rsync` usa alias `vps`, host key pinning exige `VPS_HOST_KEY`, e health checks duplicados ja nao existem.
- Auth register: verificado que falha de publish de `PERFIL_CRIADO` nao causa rollback do registo.

---

## 1. P0 Corrigidos Nesta Passagem

| ID | Fluxo | Resolucao |
|---|---|---|
| P0-SEC-01 | Instituicao le estudantes vinculados | Resposta serializada com `serializePublicProfile`; nenhum raw `/users/:id`. |
| P0-SEC-02 | Mentor le padroes de qualquer estudante | Validacao de vinculo aprovado `student-mentor` antes de `behavior-patterns`. |
| P0-SEC-03 | `verifyJwt` mascara erro downstream | Ja corrigido no commit `301b6a8`; `await next()` fica fora do `try/catch` de JWT. |
| P0-SEC-04 | Edge aceita `perfilId` spoofado | Ja corrigido no commit `301b6a8`; usa `perfilId` verificado pelo JWS. |
| P0-SEC-05 | `secrets.txt` local | Removido do disco local; rotacao Resend permanece acao externa. |
| P0-RBAC-01 | Moderador/comite publicam posts | Roles removidas de POST/PUT feed-posts. |
| P0-FLOW-01 | Conquista manual quebra por `tipoAutor` | Compatibilizacao canonic role -> enum Strapi legado. |
| P0-AUDIT-01 | Suspensao sem auditoria | `writeAuditLog('admin_suspender_utilizador')` adicionado. |

---

## 2. Sobras P1 Para Slices Seguintes

Estas nao devem bloquear a limpeza desta branch, mas precisam de ticket/slice proprio:

| ID | Area | Problema |
|---|---|---|
| P1-CAT-01 | Simulacoes | Catalogo publico de simulacoes ainda requer auth global em rotas que deveriam ser publicas. |
| P1-ENUM-01 | Estado editorial | Drift entre Spec, Zod e Strapi (`rejected`, `archived`, `hidden`). Requer ADR/sintese. |
| P1-SCHEMA-01 | Simulacoes | `capaUrl`/`iframeUrl` em Zod sem equivalencia confirmada no Strapi. |
| P1-SCORE-01 | Tentativas | Scoring de simulacoes precisa convergir totalmente para heuristicas canonicas e telemetria real. |
| P1-HOOK-01 | G15 | `behaviorHook` ainda nao processa todos os eventos relevantes de cursos. |
| P1-EXP-01 | Experiencias | Stats podem retornar zero por campos/collections divergentes. |
| P1-EXP-02 | Experiencias | Transicao `approved -> published` precisa ser revista para criadores. |
| P1-PROG-01 | Programas | `modoAcesso` nao e enforced na inscricao. |
| P1-PROG-02 | Programas | Convite/ShadowAPro/EduVisita ainda declarativo. |
| P1-PROG-03 | Programas | Inscricao precisa RBAC explicito para excluir roles nao participantes. |
| P1-PROG-04 | Programas | Pagamento/precoPolicy ainda sem processamento E2E. |
| P1-VOTE-01 | Projetos | Votos simples nao disparam hooks ecossistematicos. |
| P1-RBAC-01 | Admin | Moderador ainda nao lista utilizadores apesar da matriz indicar `gerir_utilizadores`. |
| P1-RBAC-02 | Moderacao | Escopo de comite vs moderador por tipo de conteudo precisa especializacao. |
| P1-RBAC-03 | Admin | Reativar conta e assimetrico com suspender. |
| P1-AUDIT-01 | Instituicoes | Aprovar/suspender instituicao deve auditar acoes sensiveis. |

---

## 3. Sobras P2 / Governanca

- Rule of 300 segue com violacoes estruturais ja conhecidas.
- `dispatchHooks` ainda nao usa dependencias para ordenar hooks.
- Eventos `SIMULACAO_APROVADA`, `SIMULACAO_REJEITADA` e `PROGRAMA_APROVADO` precisam ser reconciliados com eventos emitidos de fato.
- Export CSV ainda nao existe como fluxo BFF.
- `sharesCount` em feed-posts continua dependente de alinhamento Strapi/contrato.
- Algumas rotas ainda usam clientes HTTP legados sem `*Parsed`.

---

## 4. Evidencia de Testes Adicionados

- `apps/api/src/routes/perfis.spec.ts`: regressao para impedir raw user/PII em estudantes vinculados.
- `apps/api/src/routes/telemetria.spec.ts`: regressao para bloquear mentor sem vinculo aprovado.
- `apps/api/src/routes/admin.spec.ts`: regressao de audit log na suspensao.
- `apps/api/src/routes/conquistas.spec.ts`: regressao de `tipoAutor` para estudante e super_admin.

---

## 5. Acao Externa

Rotacionar no Resend as chaves que estavam no antigo `secrets.txt`.
O ficheiro local foi removido, mas remocao local nao invalida credenciais ja expostas no disco.
