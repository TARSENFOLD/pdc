# ADR 017: Design System "Soul & Elite" (Sovereign UI)

**Data:** 21 de Abril de 2026
**Status:** Aceite
**Área:** Design System & UX/UI (Frontend)
**Decisão:** Substitui a ADR-006 e formaliza o Design System "Soul & Elite".

## Contexto

O PDC v2 necessitava de uma identidade visual que equilibrasse a sofisticação tecnológica global (estética Apple) com a alma cultural angolana. A ADR-006 iniciou o conceito de "Herança Invisível", mas as especificações de cores e geometria evoluíram para o patamar "Soul & Elite" definido na [spec:IMPORTANTE/05](../../specs/IMPORTANTE/05_%E2%80%94_Design_System_Soul_%26_Elite_%28Tokens%2C_Primitivos_e_Wireframes%29.md).

## Decisão Técnica

Ratificamos o Design System **Soul & Elite** como o padrão soberano para todos os workspaces.

### 1. Design Tokens (SSOT)
A única fonte de verdade para cores, tipografia, espaçamento e radii reside em:
`apps/web/src/styles/tokens.css`

#### Mudanças Críticas vs ADR-006:
- **Superfícies**: Migração de off-white genérico para `#F8F9FA` (canvas) e `#FAF6EE` (elevated/sand layer).
- **Tinta**: Migração de `#333333` para `#2A2724` (cinzento-castanho quente).
- **Acento**: Terracota oficializado em `#D2691E`.
- **Radii Assimétricos**: Formalização da regra TL+BR (`--radius-asym-a: 18px 6px 18px 6px`).

### 2. Os 5 Primitivos de UI
A interface deve ser construída obrigatoriamente a partir destes componentes de base:
1.  **BentoGrid**: Dashboards role-aware baseados em tiles.
2.  **GlassCard**: Painéis de IA (Tina) com glassmorphism.
3.  **AsymmetricButton**: CTA de autoridade com radii par.
4.  **HUDPanel**: Overlays escuros de telemetria em tempo real.
5.  **AspirationalEmpty**: Estados vazios com promessa visual.

### 3. Princípios Operacionais
- **Proporção do Acento**: O Terracota deve ocupar ≤ 5% da área visível.
- **Toque Mínimo**: Alinhamento estrito com o padrão Apple/Android de **44px** em áreas interactivas.
- **Física de Movimento**: Animações baseadas em springs reais via Motion lib.

## Consequências

- **Positivas**: Consistência visual absoluta entre telemóvel e desktop; eliminação de cores hardcoded no código; facilitação do onboarding de novos designers/devs.
- **Desafios**: Exige rigor no uso de Custom Properties; proíbe o uso de utilidades Tailwind arbitrárias (ex: `bg-white` ou `rounded-md`) em favor de tokens semânticos (ex: `bg-surface-elevated` ou `rounded-ui-md`).

---
*Doc is Law — Última auditoria: 21 de Abril de 2026.*
