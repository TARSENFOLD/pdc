# Fontes de Produto — Agosto de 2026

> **Classificação:** referência fundacional de produto (Caixa B).
>
> Estes documentos preservam a intenção do produto e orientam a evolução das
> especificações. Não substituem `specs/IMPORTANTE/01–06`, a Constituição nem
> os ADRs. Se surgir uma divergência, a implementação deve parar para síntese e
> ratificação documental; não se transforma esta fonte em código por inferência.

## Originais preservados

| Documento | Data da fonte | Integridade SHA-256 | Papel |
| --- | --- | --- | --- |
| [`PDC-visao-produto-2026-08-18.odt`](PDC-visao-produto-2026-08-18.odt) | 2026-08-18 | `a81474fb0e72bc895574983db7550f716c4fa50fd11dd68a52c95d6b71ea3d26` | Visão geral do PDC, jornada e valor por público |
| [`PDC-Digital-Work-Experience-2026-08-19.pdf`](PDC-Digital-Work-Experience-2026-08-19.pdf) | 2026-08-19 | `9d98299aa6aedc0d6062bd83ef62a9df7e792ba11a4a533918571c576ac5beff` | Definição, percurso e modelo de produção da VWX |

## Leitura consolidada

### A promessa do PDC

O PDC reduz decisões educacionais tomadas às cegas e acompanha a pessoa antes
da escolha, durante a aprendizagem e antes da desistência. A jornada de produto
é:

`Explorar → Experimentar → Aprender → Provar → Decidir`

| Etapa | Meio no PDC | Pergunta respondida |
| --- | --- | --- |
| Explorar | Experiências | Como é realmente estudar ou exercer esta área? |
| Experimentar | Simulações | Consigo lidar com tarefas próximas da realidade? |
| Aprender | Cursos | Que competências preciso desenvolver? |
| Provar | Projectos | Que evidências consigo apresentar ao mercado? |
| Decidir | Perfil Vocacional | O que os meus dados e comportamento revelam? |

### Curso e VWX não são o mesmo conteúdo

- **Curso:** percurso formativo criado por mentor ou instituição, organizado em
  módulos e aulas/itens, com progresso e certificação. Pode ser gratuito ou
  pago conforme as regras canónicas.
- **Experiência/VWX:** contacto estruturado com uma profissão. Não é apenas um
  curso, vídeo ou artigo; conduz a pessoa por contexto, briefing, exploração,
  prática, entregável, debrief e reflexão.
- **Simulação:** tarefa prática e observável. É o espaço principal de medição
  comportamental, não um substituto para conteúdo passivo.
- **Projecto:** evidência produzida pela pessoa e apresentada ao mercado com
  camadas pública e privada.

### Contrato de criação e validação

As fontes estabelecem um princípio comum: conteúdo disperso deve ser
transformado num percurso coerente, e a publicação requer validação humana.

- O criador organiza objectivos, módulos, aulas, materiais e resultados
  esperados.
- O rascunho pode permanecer incompleto para permitir trabalho progressivo.
- A submissão para revisão exige os campos e conteúdos essenciais completos.
- Cursos são moderados segundo a spec canónica; numa VWX feita com uma entidade
  parceira, essa entidade valida a representação da profissão, a marca e os
  conteúdos antes da divulgação.
- Depois da aprovação, o PDC publica, acompanha a utilização e recolhe feedback
  para melhoria.

### Contrato de consumo

- A pessoa deve perceber o percurso e a posição actual sem enfrentar uma página
  única excessivamente longa.
- O conteúdo deve ser dividido em unidades consumíveis, com navegação visível,
  progresso e continuidade.
- O consumo de curso deve respeitar a hierarquia
  `Curso → Módulos → Aulas/Itens` e apresentar o conteúdo actual numa área
  principal.
- Uma VWX futura deve preservar a sequência
  `Contexto → Briefing → Exploração → Prática → Entregável → Debrief → Reflexão`.

## Prioridade activa: fluxo de cursos consumível

Esta ingestão documental **não autoriza implementar todo o ecossistema**. O
trabalho imediato continua limitado ao fluxo de cursos:

1. criar e guardar um rascunho;
2. estruturar módulos e aulas/itens;
3. carregar e apresentar mídia com regras compreensíveis;
4. bloquear submissão enquanto os critérios obrigatórios não estiverem
   cumpridos;
5. submeter, moderar e publicar;
6. descobrir/inscrever-se e consumir o curso com navegação, progresso e estados
   claros.

### Decisões complementares da validação visual em curso

Estas decisões vêm da revisão do produto feita em sessão e complementam as duas
fontes acima; ainda devem ser reconciliadas com a spec e o ADR aplicável antes
da entrega final:

- a primeira vista do consumo é uma página de boas-vindas;
- a navegação lateral por módulos e aulas é fixa e pode ser ocultada;
- cada módulo aceita no máximo um vídeo, apresentado primeiro;
- imagens de uma aula aparecem antes do texto; quando houver várias, formam uma
  galeria com deslocação horizontal;
- os botões de adicionar aula e módulo ficam depois da lista correspondente;
- placeholders e ajuda explicam o que escrever e onde a informação aparecerá
  no catálogo, detalhe e consumo.

## Fora do escopo desta prioridade

Não implementar agora, apenas por estarem descritos nestas fontes: o builder
completo de VWX, todas as modalidades de parceria, perfil vocacional completo,
telemetria avançada, simuladores adicionais, relatórios B2B ou todos os fluxos
de projectos. Esses temas regressam a planeamento próprio depois de o percurso
de cursos estar funcional e consumível.
