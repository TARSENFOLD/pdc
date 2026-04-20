# PDC v2 — Project State

> Memória persistente do projecto entre sessões. Lê este ficheiro PRIMEIRO.

## Current Status
Concluímos com sucesso as **Waves 0, 1 e 2**. Estamos agora a iniciar a **Wave 3 (Design System Soul & Elite)**.

```
Wave 0 — Fundação          [x] COMPLETA
Wave 1 — Auth & Edge       [x] COMPLETA
Wave 2 — Motor Vocacional  [x] COMPLETA
Wave 3 — Design System     [~] INICIANDO (Purga de cores, Primitivos)
Wave 4 — Dashboards        [ ] NÃO INICIADA (Bento Grids)
Wave 5 — Gamificação       [ ] NÃO INICIADA
```

## Realizações Recentes (Wave 2)
- **Motor de Heurísticas ($\phi$ e $R$):** Implementado e determinístico em `@pdc/shared`.
- **Telemetria Edge-First:** Pipeline completo (Edge -> Queue -> BFF Consumer).
- **Simulações:** Tipo 1, 2 e 3 operacionais.
- **Feed Soberano:** Algoritmo de ranking funcional.
- **Relatório Vocacional:** Versão Premium MVP integrada.
- **SSOT:** FeatureRegistry e Bootstrap em 4 camadas operacionais.

## Bloqueios Resolvidos
- O drift documental entre o código e o planeamento foi saneado via **Epics Canónicas (01-05)**.

## Próximos Passos (Imediato)
1. **W3-T1:** Token Audit e purga de cores hardcoded (substituir por variáveis CSS).
2. **W3-T2:** Implementação dos Primitivos (BentoGrid, GlassCard, AsymmetricButton).
3. **W3-T4:** Endurecimento de acessibilidade (Axe-core gate).

## Debt Registado
1. **Consolidação de Heurísticas:** Unificar engine do BFF com Shared.
2. **Limpeza de `any`:** 4 instâncias residuais em `FeedPage.tsx`.

---
*Última atualização: 20 de Abril de 2026.*
