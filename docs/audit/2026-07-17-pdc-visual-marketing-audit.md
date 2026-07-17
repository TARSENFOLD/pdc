# Auditoria Visual e de Marketing do PDC — usepdc.com

**Data:** 17 de julho de 2026  
**Estado:** auditoria concluída; implementação pendente  
**Relatórios:** [Google Docs](https://docs.google.com/document/d/14o-BIfCKWueSUfmogxQwT7imowV0s1zABjq7NUGE1V0) · [Notion](https://app.notion.com/p/3a014ba90ba681aabeb1ed78b560294a)

> **Decisão recomendada:** não ampliar aquisição paga, campanhas ou outreach institucional enquanto os três P0 — prova social, diagnóstico e base legal — não estiverem resolvidos.

## Resumo executivo

O PDC já apresenta uma homepage visualmente distinta e com boa hierarquia, tipografia editorial e uma paleta sóbria. No entanto, a experiência pública ainda não demonstra a tese canónica do produto: uma **infraestrutura de decisão educacional baseada em evidência comportamental**, com a jornada Explorar → Experimentar → Aprender → Provar → Decidir.

Hoje, a camada de marketing promete mais do que a camada pública consegue provar. A auditoria encontrou estatísticas que crescem por código sem fonte verificável, um feed de atividade com fallback fictício, um “diagnóstico” que calcula 88% por uma fórmula independente de compatibilidade real, recomendações que levam a simulações inexistentes, catálogo público vazio, páginas legais em placeholder e ausência de uma via institucional coerente com o comprador principal.

A prioridade não é redesenhar tudo. É restaurar verdade, confiança e continuidade do funil, preservando a identidade visual que já funciona.

## Escopo e método

Auditoria realizada em 17 de julho de 2026 sobre:

- homepage, navegação, tema claro/escuro e estados de carregamento;
- diagnóstico instantâneo completo com dados sintéticos;
- catálogo público e filtros;
- login e onboarding de estudante, mentor e instituição;
- páginas de privacidade, termos e cookies;
- metadados, indexação, sitemap, robots e partilha social;
- coerência entre marketing, produto e documentação canónica;
- implementação relevante no repositório;
- benchmark público com Forage;
- enquadramento oficial de proteção de dados e divisão administrativa de Angola.

A avaliação visual e responsiva é heurística; não substitui uma auditoria formal WCAG, testes de utilizador, dados de Core Web Vitals de campo ou revisão jurídica.

## Scorecard qualitativo

Escala: 0 = inexistente/criticamente falho; 5 = forte e comprovado.

- Identidade visual e primeira impressão: **4,1/5**
- Clareza de posicionamento: **2,2/5**
- Verdade do produto e evidência: **1,0/5**
- Continuidade de conversão: **1,4/5**
- Confiança, legal e segurança percebida: **0,5/5**
- SEO técnico e partilha: **1,2/5**
- Estratégia institucional: **1,0/5**
- Medição de marketing: **0,4/5**
- Consistência UX, linguagem e geografia: **2,0/5**

Os números são uma escala editorial de priorização, não métricas de produto.

## O que está forte

### 1. Identidade visual

- A homepage escura é memorável, premium e diferenciada no contexto edtech local.
- O contraste entre Instrument Serif, Inter, fundo carvão e terracota cria hierarquia e personalidade.
- O hero, a cadência de secções e os CTAs principais são visualmente legíveis.
- O tema claro funciona na maior parte do conteúdo abaixo do hero.
- As escolhas de registo por perfil são apresentadas em cartões claros e bem separados.

Recomendação: manter o sistema visual como base; melhorar consistência entre landing, catálogo e autenticação em vez de iniciar outro redesign.

### 2. Direção estratégica já documentada

O Command Center define o PDC como produto em produção, numa fase de refinamento, SEO, conteúdo, autoridade e preparação comercial, com qualidade acima de velocidade e instituições como comprador principal. [Fonte no Notion](https://app.notion.com/p/39514ba90ba681738dceee276395d5dc)

A arquitetura VWX reforça uma interação ancorada em necessidade, promessa, ação e evidência, com progressive disclosure. [Fonte no Notion](https://app.notion.com/p/39b14ba90ba681958b78dfd968318e02)

A implementação pública ainda não cumpre integralmente essas decisões.

## Bloqueadores P0

### P0.1 — Prova social e métricas fabricadas

**Evidência**

- A secção de números exibe “Horas poupadas”, “Vagas universitárias optimizadas” e “Estudantes com rota definida”.
- Em `apps/web/src/features/landing/LandingMarquee.tsx`, os valores são hard-coded, começam em 91% do alvo e recebem incrementos aleatórios a cada 4–8 segundos.
- O “Live Pulse” usa nomes e atividades pré-escritos em `livePulseData.ts` e um fallback aleatório em `LandingLivePulse.tsx`.

**Risco**

É um problema de confiança, não apenas de copy. Instituições, estudantes e parceiros podem interpretar estes elementos como telemetria real. A aparência de atividade em tempo real amplia o risco reputacional.

**Correção**

- Remover imediatamente contadores animados e nomes/eventos fictícios do ambiente público.
- Substituir por prova verificável: parceiros nomeados com autorização, resultados acompanhados de período/amostra/metodologia, ou linguagem honesta de produto em piloto.
- Se for necessário demonstrar um componente, marcar inequivocamente “Exemplo ilustrativo” e não o apresentar como atividade ao vivo.
- Criar um registo interno de claims com fonte, proprietário, período, definição e estado de aprovação.

**Aceitação**

Nenhuma métrica pública existe sem fonte auditável; nenhum evento fictício parece atividade real; QA confirma a remoção em desktop e mobile.

### P0.2 — Diagnóstico instantâneo produz falsa precisão e quebra o funil

**Evidência**

O teste sintético recebeu “88% Compatibilidade Detectada” e o arquétipo “Explorador Pragmático”. O backend usa fallback `68 + respostas únicas × 4`, limitado a 92; cinco respostas diferentes produzem sempre 88. O detector de área depende de palavras-chave explícitas e pode devolver “OUTRA”. O fallback inventa três títulos de simulação.

Os links gerados em `MicroDesafioVeredito.tsx` levam a slugs que não existem; o teste terminou em “Simulação não encontrada”. O CTA usa `/register?area=OUTRA`, é redirecionado para `/criar-conta` e perde o contexto da área. O catálogo para OUTRA e TECNOLOGIA estava vazio.

**Risco**

O PDC declara evidência comportamental, mas a experiência pública funciona como questionário genérico com percentagem não validada. A falsa precisão prejudica a tese central e a conversão.

**Correção**

- Até existir uma avaliação válida, renomear para “triagem inicial de interesses”.
- Remover percentagem de compatibilidade, arquétipo e qualquer claim de certeza.
- Recomendar apenas entidades reais do catálogo por ID/slug, validadas no backend.
- Preservar área/origem/UTM ao longo do registo.
- Quando não houver conteúdo, apresentar um estado honesto: lista de espera, sugestão adjacente ou contacto, nunca link morto.
- Evoluir o diagnóstico para uma microtarefa com output observável, alinhada à arquitetura VWX.

**Aceitação**

100% das recomendações levam a conteúdo publicado; nenhuma pontuação é gerada por fórmula arbitrária; o contexto sobrevive ao registo; testes cobrem área conhecida, OUTRA, catálogo vazio e erro de rede.

### P0.3 — Privacidade, termos, menores e tratamento de dados incompletos

**Evidência**

- `/privacidade` e `/termos` contêm texto placeholder.
- `/cookies` é demasiado curto e declara telemetria comportamental essencial sem detalhar categorias, finalidades, retenção ou opções.
- O onboarding recolhe data de nascimento; o fluxo de mentor pede diploma/comprovativo; o produto cria perfil e recomendações.
- A caixa de consentimento agrupa termos, privacidade e tratamento de dados.
- O footer não liga para políticas, contacto ou metodologia.

**Risco**

Isto bloqueia campanhas, parcerias e aquisição responsável. Também reduz conversão: pedir dados sensíveis antes de explicar finalidade, segurança e valor gera desconfiança.

A APD de Angola descreve consentimento como livre, específico, informado e inequívoco para a operação de tratamento. A redação e os fluxos devem ser revistos por assessoria jurídica; esta auditoria não é parecer legal.

**Correção**

- Produzir política de privacidade completa: responsável, contacto, categorias, finalidades, bases, destinatários, transferências, retenção, segurança, direitos, reclamação, menores e decisões automatizadas/perfis.
- Completar termos de uso e política de cookies.
- Mapear todos os dados recolhidos e eliminar campos não necessários na primeira etapa.
- Implementar fluxo explícito para menores/encarregado quando aplicável.
- Separar aceitação contratual de consentimentos opcionais.
- Explicar o upload de documentos do mentor antes da recolha e definir retenção/acesso.
- Adicionar links legais persistentes no footer e nos formulários.

**Aceitação**

Conteúdo aprovado juridicamente, data map concluído, fluxos de menor e consentimento testados, políticas linkadas em todos os pontos de recolha e nenhum placeholder em produção.

## Auditoria de posicionamento e mensagem

### Promessa principal

“Experimenta uma profissão antes de escolher” é simples e forte. A frase seguinte muda para “dia a dia de um estudante do curso”, o que mistura experimentar profissão com experimentar curso. “Decide o teu futuro com segurança” e “Sem adivinhação” prometem certeza que o produto público ainda não demonstra.

A badge “A tua comunidade educacional”, a imagem de um dashboard de curso, “cursos certificados” e “tutor IA” reposicionam o produto como LMS/comunidade. Isso contradiz a tese “infraestrutura de decisão educacional”.

**Direção de copy recomendada**

- Headline: “Experimenta o trabalho antes de escolher o curso.”
- Subheadline: “Resolve tarefas curtas inspiradas em contextos reais, observa como pensas e constrói evidência para decidir com mais clareza.”
- CTA principal: “Experimentar uma área”
- CTA secundário institucional: “Criar um piloto com o PDC”
- Prova: “Em piloto” ou dados verificados, nunca números decorativos.

### Arquitetura de audiência

A homepage é quase totalmente B2C, embora o comprador principal seja institucional. Faltam:

- página “Para instituições”;
- proposta de piloto, demo ou conversa;
- explicação de implementação, privacidade, reporting e suporte;
- prova institucional;
- casos de uso para universidades, escolas, empresas e programas de talento.

Recomendação: manter uma homepage simples com dupla saída e criar uma landing institucional própria. O auto-registo com NIF é demasiado cedo; a primeira ação institucional deve ser “Pedir piloto/demo”, com qualificação leve.

## Auditoria de conversão

### Funil atual

1. Homepage cria expectativa visual forte.
2. CTA leva ao diagnóstico/questionário.
3. Resultado apresenta precisão não validada.
4. Recomendação leva a conteúdo inexistente.
5. Catálogo mostra ausência de oferta.
6. Registo volta a pedir escolha de perfil e perde contexto.

O maior problema é a quebra entre promessa e próxima ação.

### Catálogo público

- Amostras OUTRA e TECNOLOGIA não tinham cursos, simulações, experiências nem programas.
- A interface perde o sistema visual da landing, usa tipografia pequena e filtro horizontal com overflow.
- Claims como “instituições de prestígio” e “instituições de elite” aparecem sem prova.
- Estados vazios não ajudam o utilizador a avançar.

**Correção**

Não divulgar um catálogo vazio. Publicar primeiro um seed mínimo de qualidade: 3–5 simulações reais, cada uma com objetivo, duração, tarefa, evidência produzida, contexto profissional e próximo passo. Quando uma categoria estiver vazia, não a destacar na aquisição.

### Onboarding

- Estudante: promete “Perfil Vocacional Completo” antes de qualquer comportamento; data em formato `mm/dd/yyyy`; falta fluxo visível para menor.
- Instituição: lista antiga de 18 províncias; Angola está hard-coded; pede NIF antes de construir confiança; copy “Atraí talentos” deve ser “Atrai talentos”.
- Mentor: solicita diploma no primeiro contacto e expõe controlo nativo em inglês; promete aprovação em 48h sem prova operacional.
- Login: “acadêmico” deve ser “académico” no padrão usado pelo projeto.
- Há mistura de “você”/“tu”, “não é”/“não és” e paletas terracota, teal e verde.

**Correção**

Adotar onboarding progressivo: conta mínima → valor inicial → dados adicionais justificados. Definir guia de linguagem PT-AO, formato local de data e arquitetura internacionalizável de país/província.

## Confiança e prova

A homepage não oferece equipa, contacto, metodologia, parceiros reais, estudo de caso, política editorial ou explicação de como recomendações são geradas. A partilha social usa `og-default.png` 1200×630 que apareceu praticamente preta/vazia no teste.

Existe um Google Doc interno com claims de tração diferentes dos números da homepage. Esses dados só devem ser publicados após validação contra fonte bruta, definição e período. A divergência atual indica falta de governança de claims.

Criar uma “escada de prova”:

1. prova de existência: simulações publicadas e navegáveis;
2. prova de método: como tarefas viram evidência;
3. prova de utilização: amostra e período;
4. prova de resultado: resultados com definição;
5. prova institucional: parceiros/casos autorizados.

## SEO técnico e distribuição

### Achados

- Title da homepage duplicado: “PDC - Por Dentro do Curso | PDC - Por Dentro do Curso”.
- `/robots.txt` e `/sitemap.xml` devolvem 404.
- Não foi encontrado JSON-LD nem hreflang.
- Páginas legais herdam title, description e canonical da homepage.
- A lógica `SEOHead.tsx` altera o head apenas no cliente; sem prerender/SSR, páginas públicas têm menor consistência para crawlers e partilha.
- A busca `site:usepdc.com` mostrou apenas a homepage no teste.
- O OG atual não comunica proposta ou marca.
- Não foram encontrados instrumentos de analytics de marketing no repositório.

### Correção

- Implementar metadados por rota no servidor/prerender.
- Criar robots e sitemap somente com páginas públicas úteis e indexáveis.
- Canonical por rota; noindex para autenticação, resultados efémeros e estados sem valor.
- Criar Organization + WebSite e, quando aplicável, BreadcrumbList estruturado.
- Produzir OG 1200×630 legível com marca, promessa e contraste.
- Criar páginas indexáveis por área/carreira somente quando tiverem conteúdo real.
- Definir arquitetura de conteúdo: exploração de carreira, comparação curso–profissão, microtarefas reais, decisão educacional e orientação institucional.

## Medição de marketing

Antes de definir metas de conversão, estabelecer baseline real.

Eventos mínimos, sem PII em payload:

- `landing_view`
- `hero_cta_click`
- `triage_start`
- `triage_complete`
- `catalog_view`
- `catalog_item_click`
- `simulation_start`
- `simulation_complete`
- `registration_role_selected`
- `registration_start`
- `registration_complete`
- `institution_demo_start`
- `institution_demo_submit`

Guardar source, medium, campaign e landing; documentar consentimento e retenção. Dashboard semanal: visita → triagem → conteúdo real → registo → primeira simulação → conclusão → lead institucional.

## Prioridades de execução

### Gate 0 — antes de aumentar exposição

1. Remover prova social fabricada.
2. Corrigir/desligar diagnóstico enganoso e links mortos.
3. Completar legal, privacidade, menores e consentimento.

### Sprint de fundação — 1 a 2 semanas

4. Publicar catálogo mínimo real e estados vazios úteis.
5. Corrigir copy, língua, datas e províncias.
6. Implementar robots, sitemap, metadata por rota, OG e noindex.
7. Instrumentar o funil.

### Crescimento com prova — 2 a 6 semanas

8. Criar landing institucional e fluxo de piloto/demo.
9. Publicar metodologia e primeiro caso verificável.
10. Criar clusters de conteúdo apoiados em experiências reais.
11. Fazer testes de utilizador com estudantes e decisores institucionais.

## Definition of Done do relançamento de marketing

O PDC está pronto para ampliar aquisição quando:

- nenhuma métrica/atividade pública é simulada sem rótulo;
- o diagnóstico não produz falsa precisão;
- todas as recomendações abrem conteúdo real;
- pelo menos três simulações de alta qualidade estão públicas;
- privacidade, termos, cookies e menoridade foram revistos;
- existe CTA e landing institucional;
- sitemap, robots, canonical, OG e metadata por rota estão corretos;
- o funil é medido de ponta a ponta;
- claims públicos têm fonte, definição, período e responsável;
- QA desktop/mobile e teste com utilizadores não encontram bloqueios críticos.

## Backlog recomendado

O backlog executável será criado no GitHub e replicado na base PDC Tasks. A tarefa existente de auditoria da homepage será ligada a este relatório. [Fonte no Notion](https://app.notion.com/p/39514ba90ba681b18a0fd807975079a8)

## Fontes

- [Fonte no Notion](https://app.notion.com/p/39514ba90ba681738dceee276395d5dc) — direção estratégica e estado do produto.
- [Fonte no Notion](https://app.notion.com/p/39b14ba90ba681958b78dfd968318e02) — arquitetura VWX e progressive disclosure.
- [PDC em produção](https://usepdc.com/) — experiência pública auditada em 17/07/2026.
- [Forage](https://www.theforage.com/) — benchmark público de catálogo, prova e onboarding.
- [APD Angola — proteção de dados](https://apd.ao/ao/perguntas-frequentes/questoes-sobre-proteccao-de-dados/) — orientação oficial sobre consentimento.
- [Governo de Angola — províncias](https://governo.gov.ao/angola/provincias) — divisão administrativa atual.
- Repositório privado `devpdc2-png/pdc` — fonte canónica e implementação analisada.

## Issues GitHub

- #11 — P0: remover métricas e atividade social fabricadas — [https://github.com/devpdc2-png/pdc/issues/11](https://github.com/devpdc2-png/pdc/issues/11)
- #12 — P0: reestruturar diagnóstico e recomendações — [https://github.com/devpdc2-png/pdc/issues/12](https://github.com/devpdc2-png/pdc/issues/12)
- #13 — P0: completar legal, menores e governança de dados — [https://github.com/devpdc2-png/pdc/issues/13](https://github.com/devpdc2-png/pdc/issues/13)
- #14 — P1: publicar catálogo mínimo real — [https://github.com/devpdc2-png/pdc/issues/14](https://github.com/devpdc2-png/pdc/issues/14)
- #15 — P1: criar funil institucional de piloto/demo — [https://github.com/devpdc2-png/pdc/issues/15](https://github.com/devpdc2-png/pdc/issues/15)
- #16 — P1: corrigir SEO e partilha social — [https://github.com/devpdc2-png/pdc/issues/16](https://github.com/devpdc2-png/pdc/issues/16)
- #17 — P1: alinhar posicionamento, PT-AO, design e geografia — [https://github.com/devpdc2-png/pdc/issues/17](https://github.com/devpdc2-png/pdc/issues/17)
- #18 — P1: instrumentar marketing e governança de claims — [https://github.com/devpdc2-png/pdc/issues/18](https://github.com/devpdc2-png/pdc/issues/18)
- #19 — P2: QA formal de performance, acessibilidade e responsividade — [https://github.com/devpdc2-png/pdc/issues/19](https://github.com/devpdc2-png/pdc/issues/19)

## Adenda — PWA, Android/iOS e conformidade das lojas

### Veredito de publicação

O PDC **não está pronto para submissão à Apple App Store ou Google Play**. A base PWA existe e contém trabalho relevante, mas não existe ainda uma aplicação móvel empacotada. O `package.json` declara `apps/mobile` como workspace, porém a pasta, os projetos Android/iOS e as configurações de empacotamento estão ausentes.

A recomendação arquitetural é manter o PWA como distribuição web e criar um shell móvel com **Capacitor** para Android e iOS. Os assets da aplicação devem ser empacotados localmente; a app não deve ser apenas uma WebView remota de `usepdc.com`. Para satisfazer a proposta do PDC e reduzir o risco Apple 4.2, o valor app-like deve vir de simulações offline, progresso sincronizado, push nativo, deep links, partilha/upload e experiência móvel robusta.

Scorecard qualitativo adicional:

- Manifest e installability web: **3,0/5**
- Offline e sincronização: **1,4/5**
- Segurança de dados offline: **0,8/5**
- Empacotamento Android/iOS: **0,0/5**
- Conformidade Apple/Google: **0,8/5**
- UGC, IA e proteção de menores para lojas: **1,3/5**
- Pipeline de submissão: **0,0/5**

### O que já existe e deve ser preservado

- Manifest com `id`, `lang: pt-AO`, start URL, scope, standalone, screenshots, shortcuts e ícones.
- Metatags iOS, viewport com `viewport-fit=cover`, Apple touch icon e splash screens.
- Service worker com estratégias distintas, fila IndexedDB de telemetria, background sync e Web Push.
- Prompt de instalação Chromium.
- Web Push opt-in iniciado pelo utilizador.
- Exportação, remoção do perfil vocacional, revogação de vínculos e eliminação/anonimização de conta dentro da área autenticada.
- Denúncia de conteúdo, suporte público e disclosure de IA.

Estes elementos reduzem trabalho, mas não bastam para uma app de loja.

### P0 móvel — cache autenticado pode expor dados entre contas

`apps/web/public/sw.js` envia qualquer GET `/api/*` para `networkFirst` e grava a resposta no cache `pdc-api-*`. O cache não é isolado por utilizador. O logout em `AuthContext.tsx` limpa React Query, mas não limpa Cache Storage, IndexedDB ou subscrições.

Em dispositivos partilhados, isto cria risco de dados pessoais ou vocacionais de uma conta permanecerem acessíveis offline após logout. A correção deve ser NetworkOnly para APIs privadas e cache apenas de recursos públicos em allowlist. Qualquer offline autenticado precisa de armazenamento por utilizador, expiração, purge e threat model próprios.

A ausência de `apps/web/public/offline.html` agrava o problema: o service worker referencia o ficheiro, mas ele não existe. A mensagem “o teu progresso está guardado” também deve ser removida até o progresso real estar persistido e sincronizado.

Issue: [#20](https://github.com/devpdc2-png/pdc/issues/20)

### Empacotamento e minimum functionality

A Apple declara que apps devem oferecer funcionalidades, conteúdo e UI além de um website reempacotado. Também rejeita bundles incompletos, placeholders e backends inacessíveis. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

O PDC deve incluir no mínimo:

- assets web empacotados localmente;
- projeto Android e iOS reproduzível;
- safe areas, teclado, status bar, botão back e links externos;
- Universal Links/App Links;
- APNs/FCM e deep links de notificações;
- uma simulação utilizável offline com sincronização segura;
- partilha/export e uploads compatíveis com permissões nativas;
- modo tablet/iPad validado;
- deteção da plataforma para esconder prompts PWA no wrapper.

Issue: [#21](https://github.com/devpdc2-png/pdc/issues/21)

### Gaps atuais do PWA

1. Os shortcuts do manifest apontam para rotas incorretas. `/feed`, `/mensagens` e `/perfil` deveriam usar `/app/*`; `/simulacoes/nova` é tratado como slug público.
2. `offline.html` não existe.
3. As notificações referem `/icons/icon-192.png`, enquanto o asset usado pelo manifest é `/icon-192.png`.
4. `InstallPrompt.tsx` não cobre instalação iOS, não deteta modo standalone, não guarda dismiss com TTL e não mede prompt/aceitação.
5. O update flow ativa o novo service worker e recarrega sem diálogo, podendo interromper uma tarefa.
6. `start_url: /` abre a landing, não a experiência autenticada.
7. `orientation: portrait` não foi justificada para tablet/iPad.
8. O set raster não inclui asset 1024px de loja e as screenshots precisam de validação contra features reais.
9. Splash screens listadas cobrem modelos antigos; o wrapper nativo deve usar o asset catalog atual, não depender destas tags.

Issue: [#23](https://github.com/devpdc2-png/pdc/issues/23)

### Apple App Store — requisitos relevantes em julho de 2026

- Desde 28 de abril de 2026, uploads devem usar Xcode 26+ e SDK iOS/iPadOS 26+. [Apple Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/)
- Guideline 4.2: evitar app que seja apenas website reempacotado.
- Guideline 2.1: remover placeholders/estados vazios, testar on-device, manter backend ativo e fornecer demo account ou demo mode.
- Guideline 5.1.1: política de privacidade acessível dentro da app e no metadata, com dados, usos, terceiros, retenção, eliminação e revogação de consentimento.
- Se a app cria contas, a eliminação deve estar disponível dentro da app. O PDC já tem uma base para isto, mas a operação e retenções precisam de validação.
- Como o login oferece Google e LinkedIn, será necessário oferecer opção equivalente de privacidade no iOS — normalmente Sign in with Apple — salvo exceção realmente aplicável e documentada.
- App Privacy/Nutrition Label deve refletir Sentry Replay, push, OAuth, telemetria, chat, uploads, perfil vocacional e IA.
- O archive deve conter privacy manifests e approved reasons para APIs aplicáveis. [Apple Privacy Manifest](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- A idade é obrigatória no App Store Connect e depende do questionário, UGC, chat, IA e controlos. [Apple Age Rating](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/)
- UGC exige filtragem, denúncia, resposta atempada, bloqueio de utilizadores abusivos e contacto público.
- Conteúdo/features digitais B2C desbloqueados dentro da app estão sujeitos a In-App Purchase. A exceção enterprise pode cobrir acessos comprados por instituições, não vendas consumer individuais.
- A app deve funcionar em IPv6-only e a submissão deve incluir review notes específicas.

### Google Play — requisitos relevantes

- A partir de 31 de agosto de 2026, novas apps e updates devem target Android 16/API 36. A implementação deve nascer em API 36. [Google Target API](https://support.google.com/googleplay/android-developer/answer/11926878)
- Novas apps são publicadas como Android App Bundle e usam Play App Signing. [Android App Bundle](https://support.google.com/googleplay/android-developer/answer/9844279)
- Data Safety deve descrever recolha, partilha e proteção reais. [Google Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- Apps com criação de conta precisam de eliminação in-app e URL web pública para o pedido. [Google Account Deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- Target audience e content rating são obrigatórios; se crianças estiverem incluídas, aplicam-se Families Policies. [Google Target Audience](https://support.google.com/googleplay/android-developer/answer/9867159)
- Apps com conteúdo gerado por IA precisam de mecanismo in-app para reportar conteúdo ofensivo. [Google AI-generated Content](https://support.google.com/googleplay/android-developer/answer/13985936)
- Features/subscrições/conteúdo digital pagos dentro da app usam Google Play Billing, salvo exceção aplicável. [Google Payments](https://support.google.com/googleplay/android-developer/answer/9858738)
- A store listing, screenshots, instruções de acesso e demo devem refletir a experiência real.

### Autenticação, privacidade e menores

Pontos positivos: eliminação dentro da conta e fluxo de encarregado já aparecem no código. Pontos pendentes:

- Sign in with Apple e account-linking;
- URL web pública de eliminação;
- política/termos completos;
- data inventory por SDK e endpoint;
- App Privacy, Data Safety e privacy manifest;
- validação do mascaramento e base de tratamento do Sentry Replay;
- separação entre telemetria essencial e opcional;
- idade mínima, target audience, Families/Kids e consentimento do encarregado;
- retenção de documentos de mentor, mensagens e outputs de IA;
- purpose strings e permissões mínimas.

Issue: [#22](https://github.com/devpdc2-png/pdc/issues/22)

### UGC e IA

O PDC tem feed, posts, mensagens, perfis, mentoria e dois chats de IA. `DenunciarButton.tsx` e a fila de denúncias são uma base, mas não foi encontrada capacidade de um utilizador bloquear outro. `TinaChat.tsx` e `TutorChat.tsx` mostram disclosure de IA, porém não permitem reportar uma resposta específica.

Antes da submissão:

- bloquear/desbloquear utilizador em todas as superfícies;
- denúncia por post, mensagem, perfil e resposta de IA;
- filtro preventivo e controlos adequados à idade;
- SLA de moderação, escalonamento e auditoria;
- community guidelines e contacto;
- testes de abuso, assédio, conteúdo sexual, autolesão e prompt injection.

Issue: [#24](https://github.com/devpdc2-png/pdc/issues/24)

### Pagamentos e modelo B2B2C

A equipa precisa decidir antes de implementar billing:

- companion institucional sem compras dentro da app;
- B2C premium com StoreKit/Google Play Billing;
- modelo híbrido com entitlements separados.

A via mais simples para a primeira submissão é uma app gratuita para utilizadores já provisionados por instituições, sem CTA/preço/compra B2C dentro do wrapper. Isso precisa corresponder ao produto real; não deve ser usado para contornar as regras. Se houver premium individual consumido na app, deve existir billing e entitlement backend compatíveis.

Issue: [#25](https://github.com/devpdc2-png/pdc/issues/25)

### Gate de submissão

Não submeter até:

- #20 cache autenticado corrigido e testado com duas contas;
- #21 shell móvel e valor app-like implementados;
- #22 autenticação/privacidade/menores/eliminação fechados;
- #24 UGC e IA com report/block/moderação;
- #25 modelo de billing decidido;
- issues P0 anteriores #11–#13 concluídas;
- catálogo real e sem links mortos;
- build Android API 36/AAB e build iOS Xcode 26 validadas;
- demo account para estudante, mentor e instituição;
- metadata/screenshots/políticas sem claims fictícios;
- TestFlight e Play pre-launch report sem bloqueadores.

Pipeline e checklist: [#26](https://github.com/devpdc2-png/pdc/issues/26)

### Issues adicionais

- [#20 — P0: segurança do cache autenticado](https://github.com/devpdc2-png/pdc/issues/20)
- [#21 — P0: shell móvel Android/iOS](https://github.com/devpdc2-png/pdc/issues/21)
- [#22 — P0: autenticação, privacidade, menores e eliminação](https://github.com/devpdc2-png/pdc/issues/22)
- [#23 — P1: correções do PWA](https://github.com/devpdc2-png/pdc/issues/23)
- [#24 — P0: UGC e IA](https://github.com/devpdc2-png/pdc/issues/24)
- [#25 — P0: billing e modelo móvel](https://github.com/devpdc2-png/pdc/issues/25)
- [#26 — P1: pipeline de release](https://github.com/devpdc2-png/pdc/issues/26)
