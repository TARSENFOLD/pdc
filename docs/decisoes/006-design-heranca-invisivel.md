# ADR 006: Design de Herança Invisível e Otimização PWA (SUPERSEDED)

> [!IMPORTANT]
> **Esta ADR foi superseded pela Spec Canónica 05 — Design System Soul & Elite ([spec:IMPORTANTE/05](../../specs/IMPORTANTE/05_—_Design_System_Soul_&_Elite_(Tokens,_Primitivos_e_Wireframes).md)) e pela ADR-017.**
> Mantida apenas para rastreabilidade histórica. Não utilizar estes tokens no desenvolvimento actual.

**Data:** Abril 2026
**Status:** Aceite
**Área:** Design System & Experiência de Utilizador (Frontend)

## Contexto

À medida que o Por Dentro do Curso (PDC v2) evolui, a necessidade de estabelecer uma identidade visual de alcance global e "World-Class" entrou em conflito com a identidade fundamental do projeto: ser uma iniciativa com profundas raízes africanas (Angola). 

A abordagem típica (impor cores intensas das bandeiras, layouts saturados ou elementos demasiado folclóricos) aliena potenciais parceiros PWA internacionais e degrada a credibilidade visual de uma aplicação que gere carreiras de forma académica, científica e profissional rigorosa. 
O tema claro que implementámos revelou problemas severos de legibilidade técnica (fundo excessivamente limpo/gélido e overlay agressivo que retirava a vibração do canvas das partículas).

## Decisão Técnica ("Herança Invisível")

Definimos a arquitetura visual da UI como **"Herança Invisível"**: uma plataforma estruturalmente alinhada com Silicon Valley (React Motion, minimalismo utilitário, layout PWA nativo Apple), mas que transmite aconchego cultural subliminarmente ("Ubuntu"). O Padrão foi mapeado em 4 eixos principais:

### 1. Paleta Terra/Tech (A Química do Fundo)
- **Extinção do Branco e Preto Puro:** As camadas estruturais claras migraram para Off-white (e.g. `#F0EFE7`), minimizando a luz azul ofuscante e passando a refletir texturas baseadas em areia/barro.
- **Substituição de Tipografia Fina por Cinza Chumbo:** Textos em `#333333` em prol de estabilidade cognitiva.
- **Accents Dual:** As partículas (Constelação) mantêm laranjas elétricos e azuis vibrantes por via da **gamificação de estímulo**; porém, os detalhes institucionais adotam tons de Terracota Africana (`#C1440E`).

### 2. A Geometria e Corte dos Botões
Interrompemos a simetria perfeita em prol da tecelagem: os botões utilizam `border-radius` misto (`rounded-tr-2xl rounded-bl-2xl rounded-tl-sm rounded-br-sm`), emulando um corte tribal altamente moderno inspirado em panos e estamparia Adinkra/Kente, embutido discretamente nas utilidades do TailwindCSS.

### 3. Engajamento Sensorial na Landing Page
A interface Neural (`NeuralConstellation`) agora deteta os eventos `onMouseEnter` propagando o estado dinâmico (comportamento de `swarm`) a múltiplas secções da LandingHero, como o `MicroDesafio` e CTAs transversais. Além disto, blindámos a leitura do layout injetando um `backdrop-blur-md` acompanhado de um fundo em 70% de opacidade sobre o elemento HTML, salvaguardando a acessibilidade para quem corre o projeto num dispositivo mobile sob o sol ou baixas constrições de display.

### 4. PWA First Strict Compliance
Para acompanhar a solidez visual, garantimos comportamentos nativos via manifesto e CSS:
- Eliminação do *rubber-banding* de viewport em iOS (`overscroll-behavior-y: none`).
- Bloqueio visual na barra de estado Apple (`status-bar-style="black-translucent"`) cobrindo as notch areas com seguras `100dvh`.
- Remoção do tap-highlight grey default gerado automaticamente por toques híbridos nos ecrãs da Apple.

## Consequências

**Positivas:**
- O projeto mantém um grau soberano "Apple-like". 
- Profissionais/Estudantes do ecossistema alvo reconhecem subconscientemente pormenores quentes ligados à sua herança sem sentir exclusão ou excesso identitário.
- Maior claridade dos UI Calls to Action via gamificação das partículas e melhor contraste entre eixos.

**Desafios:**
- Força a UI a nunca usar "brancos" a partir de agora na evolução dos Componentes React. Todo o dev que criar componentes `registry` tem de consultar esta norma e herdar unicamente variáveis como `bg-surface-raised` construídas pelos design tokens originais.
