# Specs de UX por Página — Directrizes de Redesign

> **Origem:** `/fv/Notes/Estou preocupada com o.txt` (linhas 440-906, ~466 linhas de "massacre" detalhado)
>
> **Propósito:** Para cada página principal do PDC, o que está errado, o padrão de elite, e como deve ser redesenhado. Guia canónico para W4 (Redesign de Páginas).
>
> **Status:** OURO — informação insubstituível que define o "como deve parecer"

---

## 1. Dashboard — "Sala de Espera sem Vida" → "Oráculo de Progresso"

### Diagnóstico
- É um agregado de atalhos sem hierarquia de urgência.
- Gráfico de Relatório Vocacional no canto = demasiado pequeno para o core do produto.
- Sombras pesadas nos cards. Ícones que parecem clipart.
- **Veredito:** Parece sistema de gestão de condomínios. Falta storytelling de progresso.

### Padrão de Elite
- Centro do ecrã = **"Next Best Action"** ("Estás a 3 simulações de desbloquear o teu Perfil de Engenharia").
- Dashboard é **narrativa de progresso**, não armazém de botões.
- Paradoxo da Escolha: mostra tudo ao mesmo tempo → paralisia. Focar num elemento central gigante.
- O gráfico de telemetria do Relatório Vocacional é o hero da página.

### Directrizes
- Timeline de Decisão como centro visual.
- Cards com Glassmorphism real (backdrop-blur 20px + borda 1px gradiente).
- Bento Grid layout com hierarquia clara de importância.
- Skeleton states aspiracionais (não vazios negros).

---

## 2. Feed — "Deserto Social" → "Feed de Provas"

### Diagnóstico
- Feed está "preso" entre sidebar e vazio.
- Sem definição clara do que é um "Post" no PDC.
- **Veredito:** Funcionalidade "pendurada" só para dizer que é rede social.

### Padrão de Elite — 4 Fontes
1. **Geral:** Marcos reais (conquistas, conclusões), não texto livre.
2. **Vocacional:** "Caetano CJ desbloqueou Cálculo nível 5" — portfólio em tempo real.
3. **Institucional:** Experiências, programas, vagas publicadas por instituições.
4. **Trending:** Conteúdo com mais engagement nas últimas 24h.

### Directrizes
- Posts são **marcos**, não texto livre. O feed é um **portfólio de evidências**.
- Visual: cards ricos com foto + métricas + CTA.
- Mentores dão "Feedback Técnico", estudantes dão "Apoio" (não "likes" genéricos).
- Se o feed não for visual (conquistas gráficas, vídeos curtos), será ignorado.

---

## 3. Simulações — "Labirinto" → "Evento Cinematográfico"

### Diagnóstico
- Separação "Simulações" / "Cursos" / "Meus Cursos" na sidebar cria fricção.
- Cards com fotos genéricas que não comunicam "prática".
- **Veredito:** Lista de compras de supermercado.

### Padrão de Elite
- Simulação deve parecer um **evento**. "Destaque do dia" com design cinematográfico.
- Catálogo com filtros por área vocacional + dificuldade + tipo (1/2/3).

---

## 4. Simulação Tipo 2 — "Janela Pendurada" → "Cockpit de Engenharia"

### Diagnóstico
- iframe colado numa página branca = perde toda a autoridade científica.
- Score 8.5 hardcoded (bug técnico).

### Padrão de Elite — "Full-Immersion HUD"
- **Iframe central** rodeado de **HUD (Heads-Up Display):**
  - Fundo ultra-escuro, bordas neon laranja (subtil), tipografia monoespaçada.
  - **Painel esquerdo:** Monitor de Fluxo (pulsação entre cliques), Indicador de Iterações (não "Erros"), Heatmap de Foco.
  - **Painel direito:** Checklist de Marcos de Competência — objectivos que "acendem" à medida que o aluno executa.
  - **Tina:** Não é chatbot aqui. É **Sistema de Alerta de Desvio**: "Notei hesitação. Queres pista sobre a lógica de X?" (ping visual subtil após 2min de inactividade).

### Ecrã de Debriefing (Pós-Simulação)
- **Não** "Parabéns, tiveste 80%".
- **Sim:** Relatório de Performance Analítica:
  - "O teu tempo de decisão foi 20% superior à média, mas precisão caiu no final."
  - "Sugerimos foco em resistência cognitiva."
- CTA: **"Publicar esta Performance como Projecto"** — transforma esforço em capital social imediato.

---

## 5. Relatório Vocacional — "Oráculo Escondido" → "Joia da Coroa"

### Diagnóstico
- Página mais importante = design mais fraco.
- Gráfico de radar num card minúsculo.
- Dados técnicos apresentados secos.
- **Veredito:** Investidor vê amadorismo. Infográfico interativo de luxo é o mínimo.

### Padrão de Elite — "Cognitive Command Center"

#### Atmosfera
- Fundo `#05070A` (azul-petróleo profundo). Cards com Glassmorphism real.

#### Hero: Grau de Certeza
- Círculo minimalista central com gradiente (Laranja→Neon-Blue).
- Centro: "87%". Legenda: "Precisão da Decisão baseada em 14 Simulações e 220 min de telemetria."
- **Efeito:** Uso da plataforma = jogo de precisão científica.

#### Mapa de Constelação (não radar genérico)
- Pontos de luz = competências. Brilham conforme desempenho.
- Interacção: hover liga constelação a áreas de carreira. "O teu padrão de erro em Cálculo liga-te a Engenharia Civil, mas a tua persistência sugere Medicina."

#### Prova Social
- Cards de Recomendação: fotos de Mentores + logos de Instituições que "deram Match".
- Botão ghost: "Solicitar Validação de Mentor" — card expande com spring animation (sem mudar de página).

#### Threaded Insights (Tina)
- Comentários laterais no Relatório (não chat separado).
- Tina comenta directamente sobre os dados: "Embora tenhas concluído com sucesso técnico, a tua Fluidez caiu 15min antes do fim. Esforço mental pode ser insustentável a longo prazo."

---

## 6. Experiência — "Vídeo de Propaganda" → "Documentário Interativo de Decisão"

### Diagnóstico
- Tratada como vídeo de marketing institucional simples.

### Padrão de Elite — "Cinematic Immersive"

#### Visual
- Player de vídeo principal **sem bordas** + efeito "Ambilight" (cores do vídeo vazam para o fundo).
- Background: vídeo loop silencioso e desfocado do campus.

#### Timeline Curricular (navegação)
- Linha do Tempo Vertical à esquerda: 1.º Ano → 2.º Ano → Estágio.
- Clicar no marcador muda o conteúdo: "Como é a primeira aula de anatomia?", "Onde é o estágio clínico?"
- **Telemetria mede** em que anos o estudante foca mais → perfil prática vs teoria.

#### Micro-Depoimentos
- Não comentários em texto. **Áudio ou vídeo curto** (Stories) integrados na lateral.
- "O conselho do aluno do 3.º ano", "A opinião do Professor Catedrático".
- Botão: "Fazer uma pergunta a este Mentor."

#### CTA Dinâmico (Card flutuante que segue scroll)
- "Sentiste o Match? Testa as tuas aptidões agora." → leva directamente para Simulação relacionada.
- **Regra:** Nunca deixar estudante terminar uma Experiência sem desafio prático imediato.

#### Dados em Tempo Real
- Contador: "42 estudantes estão a viver esta experiência. 5 acabaram de avançar para a Simulação."
- FOMO: instituição é concorrida e desejada.

---

## 7. Ranking — "Lista de Nomes" → "Terminal de Bolsa de Valores de Talentos"

### Diagnóstico
- Lista vertical simples. Sem distinção entre 1.º e 50.º excepto número.
- **Veredito:** Folha de pauta de escola pública. Sem prestígio.

### Padrão de Elite — "The Talent Index"

#### Layout
- Cards de Performance Dinâmica (não lista vertical).
- Filtros de mercado: "Top 10 em Persistência", "Top 10 em Lógica de Engenharia", "Top 10 em Evolução Semanal".
- Card hover → expande mini-gráfico de telemetria.

#### Player Cards
- Hexágono de Atributos: Precisão, Velocidade, Consistência.
- Selo "Verificado por Telemetria" (completou Sim Tipo 2 e 3).
- **Não usar "pontos acumulados"** → usar "Índice de Prontidão (Ready Index)".

#### Feed de Ascensão (lateral)
- "Estudante X subiu 50 posições após simulação de Medicina."
- "Estudante Y validado por 3 Mentores de Elite hoje."
- Ranking como organismo vivo, não tabela estática.

#### Scout Mode (para Instituições)
- Botão: "Ativar Modo de Recrutamento".
- Ranking muda: aparece "Propor Vínculo" / "Oferecer Bolsa" ao lado de cada nome.
- Filtros: "Alunos de Luanda com 90% de match em Logística".

#### Hall of Fame
- 1.º lugar: "Destaque na Top Bar" por 24h na área.
- Card com moldura gradiente animado (Laranja Cobreado) + brilho de dados.

---

## 8. Hub de Oportunidades — "Classificados" → "Match Terminal"

### Diagnóstico
- Não existe ainda (W4-T4).

### Padrão de Elite

#### Conceito
- **Oportunidades candidatam-se ao aluno** (não o contrário).
- Cartões de Proposta com "% de Compatibilidade" calculado via telemetria vs requisitos.

#### Funil de Propostas (Pipeline visual tipo Trello ultra-minimalista)
1. **Sugestões da IA** — oportunidades detectadas pela Tina.
2. **Propostas Recebidas** — instituições que bateram à porta.
3. **Em Análise** — onde o aluno demonstrou interesse.
4. **Firmados** — decisão tomada.

#### Pitch Institucional
- Card da Instituição com "Score de Retenção" (quantos terminam o curso) + depoimentos de Mentores.
- CTA: "Aceitar Convite de Entrevista" / "Agendar Conversa com Mentor da Faculdade".

#### "Porquê do Match" (diferencial mundial)
- Ao clicar: "Foste seleccionado porque o teu desempenho na Sim Tipo 2 de 'Cálculo Estrutural' colocou-te no Top 5% de Angola."
- Confiança inabalável: evidência técnica, não esperança.

#### Talent Bounties
- Empresas/patrocinadores: "Completa este Programa com 90%+ e desbloqueia $5.000 para matrícula."
- Gamificação de elite orientada a resultados económicos reais.

---

## 9. Conquistas & Certificados — "Arquivo Morto" → "Capital Social Partilhável"

### Diagnóstico
- Design de lista de ficheiros. Certificado = ícone de papel.
- **Veredito:** Não gera orgulho. Gera "tarefa concluída".

### Padrão de Elite
- Conquista = algo que quero partilhar no Instagram **imediatamente**.
- Visual de documento oficial, não medalha infantil.
- Cada conquista desbloqueia uma oportunidade real (Mentor, Bolsa, Visibilidade).

---

## 10. Mensagens — "WhatsApp Pobre" → "Camada de Contexto"

### Diagnóstico
- Layout genérico coluna esquerda/direita. Espaço em branco mal gerido.

### Padrão de Elite
- Comunicação acontece **sobre os dados** (não em aba separada).
- Mentor pode deixar anotações **directamente no Mapa de Aptidões** do aluno.
- Investidor clica num dado de telemetria e pergunta: "Como atingiu este pico?"
- **"Threaded Insights"** (comentários contextuais) substituem chat genérico.
- Chat directo existe mas é secundário. O social é **camada de contexto**, não página separada.

---

## 11. Configurações — "Formulário de Prefeitura" → "Central de Personalização"

### O que Remover
- Título gigante "Configurações" (se está ativo na sidebar, sabe-se onde está).
- Subtexto explicativo ("Gere a sua conta...").
- Bordas internas pesadas.

### O que Realocar
- **Privacidade do Perfil** → vai para a Página de Perfil (controlar visibilidade em contexto).
- **Aparência (tema)** → dropdown no avatar da Top Bar (não escondido em 3 cliques).

### O que Acrescentar
- **Gestão de Sessões e Segurança** — dispositivos ligados, localização.
- **Exportação de Dados (RGPD)** — "Descarregar todos os meus dados de telemetria."
- **Preferências da Tina** — "Directa e Crítica" vs "Encorajadora e Suave".
- **Gestão de Vínculos Activos** — lista de Instituições com acesso, revogar num clique.
- **Modo de Foco** — esconde métricas sociais, foca só na simulação.

### Nova Arquitectura de Informação
1. **Conta & Segurança:** Email, Password, Dispositivos, Vínculos de Identidade.
2. **Experiência:** Idioma, Notificações, Preferências da IA.
3. **Dados & Privacidade:** O que o sistema mede e quem vê o Perfil Vocacional.

### Visual
- Seletor tema: Cards Ilustrados com preview da interface (não botões cinzentos). Padrão Apple/Vercel.

---

*Destilado de `/fv/Notes/Estou preocupada com o.txt` (linhas 440-906) · Abril 2026*
