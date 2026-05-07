# API de Moderação Strapi — Mapeamento Completo

> **Origem:** `/fv/Notes/API de Moderação Strapi.md` (769 linhas)
> **Status:** OURO — mapeamento completo de roles/permissões/rotas que não existe noutro doc
> **Última revisão:** Abril 2026

---

## 1. Content-Types Moderáveis

| Content-Type | Moderado por | Campos de moderação |
|-------------|-------------|---------------------|
| **Vínculo** | Super Admin, Moderador | `status`: pendente/aprovado/reprovado |
| **Conquista** | Super Admin, Moderador | `status`: pendente/aprovada/rejeitada |
| **Post (Feed)** | Super Admin, Moderador | `status`: pendente/publicado/rejeitado |
| **Experiência** | Super Admin, Moderador | `status`: rascunho/em_revisao/publicada/rejeitada |
| **Programa** | Super Admin, Moderador | `status`: rascunho/em_revisao/publicado/rejeitado |
| **Projecto** | Super Admin, Moderador | `status`: rascunho/publicado/rejeitado |
| **Simulação** | Super Admin, Moderador, Comité Científico | `status`: rascunho/validada/publicada |

---

## 2. Fluxos de Moderação

### Aprovar Vínculo
```http
PUT /api/vinculos/:id
Authorization: Bearer <API_TOKEN>
Content-Type: application/json

{
  "data": {
    "status": "aprovado"
  }
}
```

### Rejeitar Vínculo
```http
PUT /api/vinculos/:id
Authorization: Bearer <API_TOKEN>
Content-Type: application/json

{
  "data": {
    "status": "reprovado"
  }
}
```

### Aprovar Conquista
```http
PUT /api/conquistas/:id
Authorization: Bearer <API_TOKEN>
Content-Type: application/json

{
  "data": {
    "status": "aprovada"
  }
}
```

### Aprovar Post
```http
PUT /api/posts/:id
Authorization: Bearer <API_TOKEN>
Content-Type: application/json

{
  "data": {
    "status": "publicado"
  }
}
```

---

## 3. RBAC por Tipo de Conta

### Super Admin
- **Acesso total** a todos os content-types.
- Gestão de utilizadores (criar, editar, suspender, eliminar).
- Gestão de roles e permissões.
- Acesso à telemetria bruta.
- Configuração de plataforma.

### Moderador
- Aprovar/rejeitar vínculos, conquistas, posts, experiências, programas, projectos.
- Ver reportes de conteúdo.
- Acesso limitado a perfis (dados de moderação, não telemetria bruta).
- **Não pode:** criar conteúdo, gerir utilizadores, alterar configurações.

### Comité Científico
- Validar simulações (conteúdo pedagógico, rigor científico).
- Aprovar fórmulas e pesos do motor vocacional.
- **Não pode:** moderar conteúdo social (posts, vínculos).

### Instituição
- Gerir conteúdo próprio (Experiências, Programas).
- Aceitar/rejeitar vínculos com estudantes.
- Ver perfil vocacional de estudantes vinculados (com limites H1).
- **Não pode:** moderar conteúdo de outros, aceder a telemetria bruta.

### Mentor
- Criar/gerir cursos, projectos, programas.
- Aceitar/rejeitar vínculos.
- Dar endorsements em projectos.
- **Não pode:** moderar conteúdo de outros, aceder a dados de outros mentores.

### Estudante
- Criar projectos, posts no feed.
- Solicitar vínculos.
- Ver perfil público de outros.
- **Não pode:** moderar, aceder a dados privados de outros.

---

## 4. Rotas do Painel de Moderação

### Frontend (Menu Routing)

| Rota | Quem vê | Componente |
|------|---------|-----------|
| `/moderacao` | Super Admin, Moderador | PainelModeracao |
| `/moderacao/vinculos` | Super Admin, Moderador | ModeracaoVinculos |
| `/moderacao/conquistas` | Super Admin, Moderador | ModeracaoConquistas |
| `/moderacao/posts` | Super Admin, Moderador | ModeracaoPosts |
| `/moderacao/experiencias` | Super Admin, Moderador | ModeracaoExperiencias |
| `/moderacao/programas` | Super Admin, Moderador | ModeracaoProgramas |
| `/admin` | Super Admin | AdminOverview |
| `/admin/utilizadores` | Super Admin | GestaoUtilizadores |
| `/admin/configuracoes` | Super Admin | ConfiguracoesPlataforma |

---

## 5. Checklist de Implementação por Feature × Role

> Esta checklist é o mapa completo do que cada role pode fazer em cada feature.
> Extraída da análise exaustiva de 770 linhas do documento original.

### Autenticação
- [x] Login com Google OAuth
- [x] JWT httpOnly cookies
- [ ] 2FA (OTP SMS descartado para MVP — REQ-1-010)
- [x] DEV_SKIP_OTP para desenvolvimento

### Perfis
- [x] Criação de perfil por role
- [ ] Perfil público separado do dashboard (H1)
- [ ] Field-level visibility por role (H1)
- [ ] Branding institucional no perfil

### Vínculos
- [x] Schema de vínculo com estados
- [ ] UI de gestão de vínculos recebidos/enviados
- [ ] Notificações de novos pedidos
- [ ] Vínculo visível no perfil público (com flag)

### Feed
- [x] Schema de post no Strapi
- [ ] Feed dinâmico com algoritmo de ranking
- [ ] Feed de conquistas (não texto livre)
- [ ] Filtros por área de interesse

### Simulações
- [x] Tipo 1 (questionário)
- [ ] Tipo 2 (laboratório externo via iframe)
- [ ] Tipo 3 (cenário in-platform)
- [ ] Telemetria durante simulação

### Cursos
- [x] CRUD básico
- [ ] Progresso por módulo
- [ ] Conclusão com certificado

### Ranking
- [x] Score básico
- [ ] "Talent Index" com filtros
- [ ] Player Cards com hexágono de atributos

### Conquistas
- [x] Schema básico
- [ ] Conquistas automáticas por trigger
- [ ] Partilha externa com OG image

### Mensagens
- [ ] Chat contextual (sobre dados, não genérico)
- [ ] Socket.IO realtime

### Relatório Vocacional
- [x] Cálculo básico de score
- [ ] Pesos por evento (11 pesos da spec)
- [ ] Nível de certeza (BAIXA/MEDIA/ALTA)
- [ ] Recomendações cross-content

---

*Referência: `src/config/roles.js` (codebase), Strapi content-types schemas, `docs/guia-utilizador/*.md`.*
