# ADR-004 — Strapi v5 como CMS e Camada de Persistência

**Estado:** Aceite  
**Data:** 2025-11-01  
**Contexto:** Fase 0 — Fundação

---

## Contexto

O PDC v2 precisa de uma camada de persistência para:
- Conteúdo editorial (cursos, simulações, experiências) — editável por não-programadores
- Dados de utilizador (perfis, tentativas, inscrições, projetos)
- Dados de negócio (mentorias, denúncias, audit logs)

Opções consideradas:
1. **API REST customizada com PostgreSQL directo** — controlo total, mais trabalho
2. **Supabase** — PostgreSQL + Auth + Storage geridos
3. **Strapi v5** — CMS headless open-source, self-hosted
4. **Directus** — alternativa ao Strapi

---

## Decisão

Adoptar **Strapi v5** com PostgreSQL, self-hosted via Docker em desenvolvimento e Railway em produção.

O Strapi corre exclusivamente no servidor e é **nunca acedido directamente pelo frontend** — todo o acesso passa pelo BFF Hono.

---

## Justificação

**Contra API REST customizada:**
- Desenvolver CRUD, paginação, filtros, relações, upload de media e admin UI do zero é semanas de trabalho
- A equipa editorial (gestores de conteúdo) precisa de UI — não podemos pedir-lhes que usem SQL

**Contra Supabase:**
- SDK do Supabase no frontend exporia o acesso directo à BD — contorna o BFF
- Row Level Security (RLS) é poderoso mas complexo de manter com 6 roles customizados
- Lock-in no serviço gerido — sem opção de migração para self-hosted trivial
- `anon key` no frontend é um vector de ataque se mal configurada

**Contra Directus:**
- Menos adoptado — ecossistema de plugins menor
- Documentação menos madura que Strapi
- Comunidade menor (menos respostas em Stack Overflow / GitHub)

**A favor de Strapi v5:**
- Admin UI completa — gestores de conteúdo podem editar cursos sem programador
- API REST + paginação + filtros gerados automaticamente para cada Content Type
- `STRAPI_API_TOKEN` mantido exclusivamente no BFF — frontend nunca contacta Strapi
- Self-hosted — sem lock-in, dados sob controlo total
- PostgreSQL como base — migração futura para outro ORM é simples
- Upload de media integrado (com provider para Cloudflare R2)
- Suporte a webhooks — útil para invalidação de cache futura

---

## Padrão de Acesso

```
Frontend (React)
     │
     │  HTTPS + cookies httpOnly
     ▼
  BFF (Hono)
     │
     │  Bearer STRAPI_API_TOKEN (servidor para servidor)
     ▼
  Strapi v5
     │
     │  PostgreSQL driver
     ▼
  PostgreSQL
```

O frontend **nunca** comunica com o Strapi directamente. Toda a lógica de negócio (RBAC, validação, auditoria) fica no BFF.

---

## Consequências

- **Positivo:** Admin UI para conteúdo editorial sem custo de desenvolvimento
- **Positivo:** STRAPI_API_TOKEN isolado no servidor — sem exposição ao cliente
- **Positivo:** Filtros e paginação automáticos reduzem boilerplate no BFF
- **Positivo:** Self-hosted — conformidade com regulação angolana de dados
- **Negativo:** Strapi adiciona ~200–400MB de RAM em produção (aceitável no Railway)
- **Negativo:** Migrações de schema requerem atenção em deploys — criar novo Content Type antes de usar no BFF
- **Negativo:** Strapi v5 é relativamente recente — alguns plugins v4 ainda não foram portados

---

## Reavaliação

Reavaliar se:
- Strapi v5 introduzir licenciamento restritivo para funcionalidades core
- O custo de self-hosting no Railway superar o benefício vs Supabase gerido
- A equipa de conteúdo não usar o admin UI (nesse caso, a vantagem principal desaparece)
