# ADR-002 — Hono como Framework BFF

**Estado:** Aceite  
**Data:** 2025-11-05  
**Contexto:** Fase 1 — Autenticação Segura

---

## Contexto

O PDC v2 precisa de um BFF (Backend For Frontend) em Node.js que:
- Proxifica pedidos para o Strapi v5 com autenticação
- Gere JWT em cookies httpOnly
- Suporte RBAC com 6 roles
- Seja tipado end-to-end com TypeScript
- Tenha performance adequada para mercado africano (baixa latência)

Opções consideradas:
1. **Express.js** — framework Node mais popular
2. **Fastify** — alta performance, schema-first
3. **Hono** — ultra-leve, edge-ready, TypeScript-first
4. **NestJS** — framework opinativo com DI

---

## Decisão

Adoptar **Hono v4** como framework do BFF.

---

## Justificação

**Contra Express.js:**
- Sem tipagem nativa — requer `@types/express` e tipos manuais em `req`/`res`
- Middleware system não tem contexto tipado (`req.user` requer cast)
- Mais lento que Hono em benchmarks de I/O bound

**Contra Fastify:**
- Schema-first com JSON Schema é mais verboso que Zod
- Integração com Zod requer `fastify-type-provider-zod` adicional
- Contexto de handler menos elegante que Hono

**Contra NestJS:**
- Overhead significativo de DI e decorators para BFF simples
- ~50MB de dependências vs ~5MB do Hono
- Filosofia "enterprise" desalinhada com velocidade de iteração necessária

**A favor de Hono:**
- TypeScript-first: `c.get('user')` é tipado via generics `Hono<{ Variables: AuthVariables }>`
- `@hono/zod-validator` integra Zod nativamente — `c.req.valid('json')` devolve tipo inferido
- Ultra-leve (~5MB) — deploy mais rápido e cold starts menores no Railway
- Edge-ready — pode migrar para Cloudflare Workers no futuro sem reescrever
- `hono/cookie` para JWT cookies httpOnly
- `hono/cors` e `hono/secure-headers` incluídos

---

## Padrão adoptado

```typescript
// Tipo de contexto tipado
type Vars = { Variables: AuthVariables };
const routes = new Hono<Vars>();

// Validação Zod inline
routes.post('/', zValidator('json', schema), async (c) => {
  const body = c.req.valid('json'); // inferido pelo schema
  const user = c.get('user');       // AuthVariables tipado
  return c.json(result, 201);
});
```

---

## Consequências

- **Positivo:** Zero `any` em handlers — TypeScript estrito end-to-end
- **Positivo:** Sem boilerplate de tipos manuais para contexto de request
- **Positivo:** Middleware como funções simples, sem class-based overhead
- **Negativo:** Ecossistema menor que Express — menos plugins disponíveis
- **Negativo:** Equipa precisa de aprender Hono (curva mínima, ~30min)

---

## Reavaliação

Reavaliar se:
- Precisarmos de funcionalidades avançadas de DI (improvável no horizonte definido)
- Hono introduzir breaking changes em versão major (monitorizar releases)
