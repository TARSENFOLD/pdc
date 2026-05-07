# Design "Soul & Elite" — Críticas e Directrizes

> **Origem:** `/fv/Notes/Estou preocupada com o.txt` (seções de design), `/fv/Notes/o meu projeto sofreu alteracao.txt`
> **Status:** OURO — directrizes de identidade visual que guiam todas as decisões de frontend
> **Última revisão:** Abril 2026

---

## 1. Diagnóstico do Estado Anterior ("O Massacre")

### Problemas identificados

| Problema | Descrição | Solução |
|----------|-----------|---------|
| **Preto puro (#000) (na landing é permitido)** | Cansa a vista, sem profundidade | Usar `#0A0A0A` ou `#121212` — permite sombras e bordas subtis |
| **Sidebar infinita** | 13+ itens com mesmo peso visual = carga cognitiva | Agrupar: Explorar / Progresso / Conta. Ícones de linha fina. |
| **Empty states vazios** | Texto cinza no nada = desistência | Skeletons, radar em marca d'água, CTAs aspiracionais |
| **Tipografia uniforme** | Tudo 14-16px = monótono | Títulos 600 weight + subtexto 400 a 60% opacidade |
| **Laranja em excesso** | Cor de destaque em tudo = perde valor CTA | Laranja ≤ 5% da interface, resto em escala de cinzas |
| **Widget Tina intrusivo** | Popup quadrado + emoji = perda de seriedade | Arredondado + backdrop-blur + integrado no conteúdo |
| **Inconsistência de raios** | Botões redondos, cards quadrados, abas semi-redondas | Constante: 8px (pequeno), 12px (médio), 16px (grande) |
| **Design passivo** | Dashboard é lista de links, não narrativa | Timeline de Decisão: "Estás a 3 simulações de desbloquear..." |
| **Mobile ignorado** | Layout desktop-centrado | Cards adaptáveis, áreas de toque 44px, navegação por polegar |

---

## 2. A Paleta Soul & Elite

### Tema Claro (Base Canónica)
- **Fundo:** `#F8F9FA` (off-white, não branco puro)
- **Superfícies (cards):** `#FFFFFF` sobre fundo off-white
- **Texto principal:** `#1A1A1A` (grafite, nunca preto puro)
- **Texto secundário:** `#1A1A1A` a 60% opacidade

### Tema Escuro (Opção)
- **Fundo:** `#0B0E14` (azul-petróleo profundo, não preto)
- **Superfícies:** Glassmorphism — backdrop-blur 20px + borda 1px gradiente branco→transparente
- **Texto:** Cinza claro com hierarquia de opacidade

### Cores de Acento
- **Terracota/International Orange:** Acento principal (≤ 5%)
- **Institucional:** `#004AAD`
- **Azul Cobalto:** Dados estáveis
- **Verde Esmeralda Seco:** Sucessos
- **Violeta Profundo:** IA (Tina)

### Tipografia
- **Títulos:** Inter (ou Satoshi) — 600 weight, letter-spacing ajustado
- **Títulos premium:** Inter para destaque
- **Dados numéricos:** JetBrains Mono — aspecto de laboratório de alta tecnologia
- **Regra:** Contrastes brutais — título 32px ao lado de dado técnico 10px Mono

---

## 3. Princípios de Design

### "Menos é Mais, mas o Menos tem de ser Perfeito"
1. Matar bordas quadradas — raios de curvatura calculados.
2. Matar saturação — laranja só em detalhes de acção.
3. Matar silêncio visual — micro-animações, estados activos, transições suaves.

### Intencionalidade
- Dashboard conduz o utilizador, não espera que ele decida.
- Centro do ecrã = "Next Best Action" (não "lista de botões").

### Identidade Africana Moderna
- Não padrões tribais óbvios — elegância moderna: texturas de terra com néon, tipografia que fuja do "padrão Silicon Valley".
- O PDC é inovação vinda de África, não cópia de dashboard americano, mas em nenhum momento deve gritar África, deve ser sutil e elegante, quase imperceptível.

### Data-Viz como Joia da Coroa
- Relatório Vocacional = infográfico interativo de luxo, não gráfico de Excel.
- Bloomberg/Linear como inspiração, não apps de brincadeira.
- Menos ícones infantis, mais tipografia técnica e grelhas matemáticas.
- Substituir emojis por svgs ou icones mais sofisticados.

---

## 4. Directrizes por Componente

### Top Bar ("Glass Header")
- Backdrop-blur 15-20px + 80% opacidade + borda 1px `#ffffff10`.
- Esquerda: Logo + breadcrumb. Centro: Cmd+K search. Direita: Notificações + Status Tina + Seletor de contexto.

### Sidebar
- "Slim": apenas ícones (sem texto) ou retrátil - quando não estiver estendida.
- Item activo: linha vertical lateral ou mudança subtil de cor (sem fundo sólido laranja).

### Cards
- Glassmorphism: backdrop-blur + borda 1px 5% white.
- Sombras suaves para criar camadas (não flat).

### Empty States
- Nunca vazio preto — skeletons, ilustrações wireframe, CTAs aspiracionais.
- Conquistas: cadeados subtis sobre skeletons das medalhas.

### Simulação Tipo 2 (Cockpit)
- Iframe central + HUD de telemetria ao redor (estilo aviões de caça).
- Fundo ultra-escuro, bordas neon laranja (subtil), tipografia monoespaçada.
- Monitor de Fluxo, Indicador de Tentativas ("Iterações", não "Erros"), Heatmap de Foco.
- Pós-simulação: Relatório de Performance Analítica (não só "Parabéns, 80%").

---

## 5. A Lição do "Massacre de Design"

O projecto PDC sofreu uma "deriva de design" quando influências externas tentaram transformá-lo num "Oráculo da NASA" com preto puro, removendo funcionalidades essenciais (Mensagens, Feed, Ranking) por as considerarem "gordura".

**A verdade:** Essas funcionalidades são o motor de engagement. Sem social, o efeito de rede morre. O design premium não é ausência de funcionalidades — é perfeição na execução de cada detalhe.

---

*Referência canónica: `tokens.css` no codebase + Spec 05 (Design System) em `specs/IMPORTANTE/`.*
