# PDC v2 — Constitution v2.1 (Ratificada)

Este documento define as leis fundamentais de engenharia e estética do Por Dentro do Curso (PDC). Qualquer violação destas regras é considerada um bug de governação.

## 1. Integridade Técnica (Zero Any)
A tipagem estrita é inegociável. O uso de `any` em novos códigos é proibido (Error TS7006). Casos legados devem ser saneados durante a refatoração temática.

## 2. SSOT (Single Source of Truth) — @pdc/shared
Todos os contratos, schemas Zod e interfaces de domínio devem nascer e ser exportados pelo pacote `@pdc/shared`. Aplicações (`web`, `api`, `edge`) não definem formas de dados privadas que cruzam fronteiras de rede.

## 3. UI Registry & Bootstrap-driven
O sistema de UI é centralizado. O `UI Registry` (em `apps/web/src/components/ui/`) expõe apenas o que existe e está validado. A UI deve ser construída via composição de primitivos, evitando estilos ad-hoc em páginas em mobile-first em conformidade como padroes exigista peala Apple para pulbicar o aplicativo nas suaas lojas (PWA).

## 4. Telemetria Resiliente (Edge-First)
A telemetria é o coração do Oráculo. Todos os eventos críticos devem passar pelo pipeline de Edge Dual-Write (Vercel Edge -> Upstash Queue -> BFF). A perda de dados comportamentais é inaceitável.

## 5. Limite de Complexidade (Rule of 300)
Nenhum ficheiro fonte deve ultrapassar **300 linhas**. Ficheiros que excedam este limite devem ser modularizados imediatamente. 
*Excepção Histórica: `packages/shared/src/index.ts` (até ao refactor total).*

---

## 6. Estética Soberana
- **Tema**: Claro como BASE (#F8F9FA); Escuro opcional.
- **Acento**: Terracota (#D2691E) para elementos de autoridade (≤5% da UI).
- **Tipografia**:
  - Inter (UI/Corpo).
  - Instrument Serif (Títulos de Autoridade).
  - JetBrains Mono (Dados/Métricas).

---
*Ratificado em Abril de 2026.*
