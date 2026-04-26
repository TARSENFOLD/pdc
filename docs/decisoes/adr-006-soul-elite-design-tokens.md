# ADR-006: Soul & Elite Design Tokens

## Status
Ratificada em 21 de Abril de 2026.

## Contexto
O PDC v2 exige uma estética de "Autoridade e Herança", diferenciando-se de SaaS genéricos. A interface deve ser sofisticada, imersiva e visualmente repousante.

## Decisão
Fixar o sistema de tokens baseado na filosofia "Soul & Elite":
1. **Não aos Extremos:** 
   - Proibido o uso de `#000000` (preto puro) para evitar smear em ecrãs OLED e fadiga visual. Usar Antracite `#1A1817` ou similar.
   - Proibido o uso de `#FFFFFF` (branco puro). Usar Papel/Canvas `#F8F9FA`.
2. **Acento Identitário:** 
   - Terracota Africana `#D2691E` é a cor de acento soberana.
   - **Regra dos 5%:** O Terracota deve ser limitado a no máximo 5% da UI para manter o seu impacto e autoridade.
3. **Tipografia de Autoridade:**
   - **Instrument Serif:** Reservado para títulos de impacto e heros.
   - **Inter:** Fonte de sistema para legibilidade em UI e corpo de texto.
   - **JetBrains Mono:** Reservado para dados técnicos, scores de telemetria e KPIs.

## Consequências
- **Positivas:** Identidade visual única e memorável; conforto visual superior; alinhamento com a "Herança Invisível".
- **Negativas:** Requer rigor acrescido na revisão de PRs para evitar o uso de cores padrão do Tailwind sem alias.

---
*Assinado: Gemini CLI · Guardião da Estética*