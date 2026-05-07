---
description: Evoluir content-types do Strapi para suportar entitlements B2B dinâmicos (features e quotas por subscrição)
---

# Strapi Entitlement Evolver

## Contexto
O schema de subscriptions no Strapi CMS não contém campos para features e quotas dinâmicas.
Isto impede:
- A equipa comercial de gerir planos sem deploys
- O BFF de validar entitlements em runtime
- A Wave de monetização B2B

Referenciado em ADR 014 e identificado como gap D1 nas análises externas.

## Sealed Envelope

```
[SEALED ENVELOPE — PDC v2 INTEGRITY]

Spec Soberana: ADR 014 (Subscriptions & Entitlements), Spec 01 (RBAC)
Wave/Contexto: Wave 4 (Monetização & B2B)
Caixa Autorizada: C (Divergência Crítica — doc e código ambos incompletos)

Scope IN (Ficheiros permitidos):
- apps/strapi/src/api/subscription/* (evolução do content-type)
- apps/api/src/modules/entitlements/* (NOVO — serviço de entitlements)
- apps/api/src/modules/entitlements/entitlements.spec.ts (NOVO)
- packages/shared/src/entitlements.ts (NOVO — schemas Zod)
- apps/api/src/middleware/entitlement-guard.ts (NOVO)
- docs/adr/ADR-XXX-entitlements.md (NOVO)

Scope OUT (PROIBIDO TOCAR):
- apps/edge/* (Edge não muda)
- apps/web/* (Frontend — wave separada)
- apps/api/src/modules/telemetria/* (Telemetria não muda)
- apps/api/src/modules/events/* (Outbox não muda)

Blacklist Nominal (AP-01 a AP-07): Aplicável na totalidade.

Critério Done:
[ ] Content-type `subscription` no Strapi com campos JSON `features` e `quotas`
[ ] Schema Zod em @pdc/shared para SubscriptionEntitlements
[ ] Serviço `entitlements.service.ts` no BFF que lê entitlements do Strapi com cache Redis
[ ] Middleware Hono `entitlement-guard` que valida acesso a features por rota
[ ] Fail-closed: se Strapi indisponível, negar acesso (não abrir)
[ ] Migração aditiva (não breaking) do Strapi
[ ] Testes unitários
[ ] ADR criado
[ ] Typecheck verde
```

## Passos

1. **Definir schemas em `@pdc/shared`**
   - `packages/shared/src/entitlements.ts`:
     ```typescript
     FeatureFlag: z.enum(['simulacoes', 'mentoria', 'analytics', 'export', 'api-access' /* extend as new features land */])
     QuotaDefinition: z.object({ feature: FeatureFlag, limit: z.number(), period: z.enum(['day','month','unlimited']) })
     SubscriptionEntitlements: z.object({ features: z.array(FeatureFlag), quotas: z.array(QuotaDefinition) })
     ```

2. **Evoluir content-type Strapi**
   - Adicionar campos ao `subscription` content-type:
     - `features` — JSON array de feature flags activas
     - `quotas` — JSON array de limites por feature
     - `tier` — Enum: `free`, `basic`, `premium`, `enterprise`
   - Migração aditiva: campos novos com defaults vazios

3. **Criar serviço de entitlements no BFF**
   - `apps/api/src/modules/entitlements/entitlements.service.ts`:
     - `getEntitlements(instituicaoId: string): Promise<SubscriptionEntitlements>`
     - Cache Redis com TTL de 5 minutos
     - Fail-closed: erro → denegar acesso
     - Parse com Zod para garantir integridade

4. **Criar middleware Hono**
   - `entitlement-guard.ts`:
     - Recebe `requiredFeature: FeatureFlag` como parâmetro
     - Lê `instituicaoId` do contexto autenticado
     - Verifica se feature está nos entitlements activos
     - 403 se não autorizado

5. **Aplicar em rotas sensíveis**
   - Rotas de analytics avançado, export, API externa
   - Gradualmente, sem breaking changes

6. **ADR**
   - Documentar modelo de entitlements, cache strategy, fail-closed rationale
