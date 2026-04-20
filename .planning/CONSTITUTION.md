# PDC v2 — Constituição Inegociável

Este documento define as leis fundamentais de engenharia e estética do Por Dentro do Curso (PDC). Qualquer violação destas regras é um bug de governação.

## 1. Integridade Técnica (Zero Any)
A tipagem estrita é inegociável. O uso de `any` em novos códigos é proibido. Casos legados devem ser saneados durante a refatoração temática.

## 2. SSOT (Single Source of Truth)
Todos os contratos, schemas Zod e interfaces de domínio nascem no pacote `@pdc/shared`. Aplicações não definem formas de dados privadas que cruzam fronteiras de rede.

## 3. Rule of 300
Nenhum ficheiro fonte deve ultrapassar **300 linhas**. Ficheiros que excedam este limite devem ser modularizados imediatamente. (Exceção histórica: `packages/shared/src/index.ts`).

## 4. Telemetria Resiliente (Edge-First)
A telemetria é o coração do Oráculo. Perda de dados comportamentais é inaceitável. Outbox + idempotência (UUID + Redis) são obrigatórios. O browser é tratado como ambiente hostil; cálculos críticos são feitos no servidor.

## 5. Doc is Law
Se o código contradiz o markdown (Epics Canónicas), o código é defeituoso. O documento justifica o código, nunca o contrário.

## 6. Estética "Soul & Elite"
- **Herança Invisível:** Sofisticação global com raízes culturais subliminares.
- **Não aos Extremos:** Nunca usar `#000000` (evitar smear OLED) nem `#FFFFFF` puro.
- **Acento:** Terracota Africana `#D2691E` limitado a ≤ 5% da UI.
- **Tipografia:**
  - `Inter` (UI/Corpo).
  - `Instrument Serif` (Títulos de Autoridade/Heros).
  - `JetBrains Mono` (Dados/KPIs/Scores).
- **Física Apple:** Animações via Motion com springs (`stiffness: 220, damping: 28`).
- **Acessibilidade:** Mínimo 44px de toque (PWA-First).

---
*Última validação: 20 de Abril de 2026 · Fonte de verdade: Epic 01 e 05.*
