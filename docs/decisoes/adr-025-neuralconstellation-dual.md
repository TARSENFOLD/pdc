# ADR-025 — NeuralConstellation Dual: Landing vs Auth

**Data:** 2026-05-03
**Estado:** Aceite
**Autores:** Equipa PDC v2
**Referências:** `DESIGN.md § 10.1`, `DESIGN.md § 10.4`, `CLAUDE.md § 6`

---

## Contexto

O PDC v2 usa animações de partículas (canvas 2D) em dois contextos distintos:
a landing page pública e as páginas de autenticação. Ambos os contextos têm
requisitos visuais e funcionais incompatíveis — forçar um único componente
criaria acoplamento desnecessário e comprometeria a experiência em cada contexto.

## Decisão

Manter **dois componentes independentes** com o mesmo conceito visual mas
implementações separadas:

| Ficheiro | Contexto | Props principais |
|---|---|---|
| `src/features/landing/NeuralConstellation.tsx` | Landing pública | `choreography: ChoreographyState`, `particleCount`, `connectionDistance`, `mouseRadius` |
| `src/components/auth/NeuralConstellation.tsx` | Auth (login, registo) | `state: NeuralState`, `onWarpComplete` |

### Características da Landing

- 300 partículas (150 em mobile)
- DPR scaling via `ctx.setTransform(dpr, ...)`
- Twinkle animation por partícula (fase + velocidade aleatória)
- Cores lidas de CSS vars (`--accent-terracotta`, `--institutional-cobalt`, `--ink-primary`) — adapta-se ao tema claro/escuro
- Estados: `idle` (vida orgânica), `align` (hélice), `swarm` (órbita do rato), `warp` (expansão)
- Implementação: GSAP `useGSAP` + `requestAnimationFrame`

### Características da Auth

- 110 partículas, fundo preto fixo (`bg-black`)
- Canvas puro sem DPR (canvas width = element width)
- Sem twinkle — partículas reagem ao estado do formulário
- Estados reactivos a campos: `idle`, `pulse` (nome), `align` (email/NIF), `encrypt` (password), `focus` (confirmar password), `flow` (selects), `scatter` (erro), `warp` (transição)
- Implementação: Canvas2D puro + `requestAnimationFrame`

## Regras de Aplicação

- ❌ Nunca importar `NeuralConstellation` da landing nas páginas de auth
- ❌ Nunca importar `NeuralConstellation` da auth na landing
- ❌ Nunca fundir os dois num único componente com condicionais de contexto
- O mapeamento `NeuralState` → campo de formulário está documentado em `DESIGN.md § 10.4`

## Alternativas Consideradas

### Componente único com prop de contexto
Rejeitada. As props, estados e implementações são incompatíveis — Landing usa `ChoreographyState` com GSAP e DPR scaling; Auth usa `NeuralState` com Canvas2D puro. Um único componente tornaria o código frágil e difícil de manter.

### Classe base partilhada com especializações
Rejeitada. As características visuais divergem demasiado (300 vs 110 partículas, twinkle vs reação a campos, fundo CSS vars vs fundo preto fixo) para beneficiar de uma hierarquia de herança.

### Componente configurável por injeção de estratégia
Rejeitada. A complexidade da API resultante (estratégia de animação, estratégia de cor, estratégia de estado) seria maior que a duplicação intencional, sem ganho de legibilidade.

## Consequências

- Duplicação intencional e justificada — cada componente pode evoluir
  independentemente sem comprometer o outro.
- Futuras melhorias de performance (WebGL, OffscreenCanvas) podem ser aplicadas
  a cada um separadamente.
