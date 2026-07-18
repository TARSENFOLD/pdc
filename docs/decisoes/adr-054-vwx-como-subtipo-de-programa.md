# ADR-054 - PDC Digital Work Experience como subtipo de Programa

**Data:** 2026-07-19  
**Estado:** Aceite  
**Caixa:** C - a expansão empresarial introduz uma nova jornada operacional, mas não exige um novo produto raiz nem a alteração semântica da Experiência Curricular.

## Contexto

O PDC possui uma taxonomia canónica com responsabilidades distintas:

- **Experiência**: conteúdo imersivo e gratuito que permite sentir como é estudar um curso numa instituição.
- **Simulação**: execução prática e mensurável de decisões ou tarefas profissionais.
- **Projeto**: evidência autoral e ativo de carreira do participante.
- **Programa**: infraestrutura de oportunidades que organiza propósito, metodologia, recursos, cronograma, acesso e conteúdos relacionados.

A expansão **PDC Digital Work Experience (VWX)** pretende permitir que empresas e outras organizações ofereçam experiências profissionais digitais, assíncronas e orientadas por tarefas reais. Uma VWX pode conter apresentações da empresa e da profissão, vídeos de especialistas, briefings, tarefas, simulações, checkpoints, projeto final, debrief, reflexão, avaliação e credencial.

Transformar a Experiência Curricular existente numa entidade genérica para estes dois casos destruiria a clareza da taxonomia, criaria condicionais difíceis de manter e colocaria no mesmo lifecycle conteúdos com requisitos de validação diferentes.

Criar uma aplicação ou produto paralelo também duplicaria autenticação, perfis, catálogos, telemetria, reputação, projetos, moderação e infraestrutura.

## Decisão

1. **A Experiência Curricular mantém a sua definição atual.** Continua a representar como é estudar um curso específico numa instituição específica e permanece sempre gratuita.

2. **A VWX será implementada como subtipo especializado de Programa.** O contrato canónico passa a aceitar `programa.tipo = 'vwx'`, além dos tipos existentes.

3. **VWX é uma jornada ordenada, não apenas um agrupamento de conteúdos.** Será criada uma entidade relacional `programa-etapa`, com ordem, tipo, duração, obrigatoriedade, regras de desbloqueio, conteúdo, tarefa, rubrica, debrief e configuração de submissão.

4. **Os conteúdos existentes são reutilizados por composição.** Uma VWX pode referenciar Cursos, Experiências Curriculares, Simulações e Projetos, mas também pode possuir etapas nativas sem forçar cada unidade a tornar-se um conteúdo global do catálogo.

5. **Entregas e evidências serão genéricas.** Será criada uma entidade `programa-entrega` para texto, ficheiro, URL, resposta estruturada, versões, avaliação, feedback, visibilidade e consentimento de partilha.

6. **A credencial deixa de estar limitada a Curso.** A certificação será generalizada para Curso, Programa/VWX, Simulação ou conquista verificável, com tipo de credencial, critérios, competências, código e URL pública de validação.

7. **Empresas continuam a usar a fundação organizacional existente.** A entidade `instituicao` já aceita `tipo = empresa`, `ong` e `laboratorio`. O papel autenticado continua tecnicamente como gestor de organização, enquanto a UI, onboarding, permissões e linguagem se adaptam ao tipo da organização. Não será criado um role empresarial separado nesta fase.

8. **Os workflows de validação serão separados.**
   - Experiência Curricular: autenticidade institucional, rigor académico, dados curriculares e depoimentos.
   - VWX: legitimidade profissional, segurança, propriedade intelectual, confidencialidade, adequação etária, qualidade das tarefas e ausência de trabalho produtivo gratuito.

9. **Acesso empresarial a dados individuais exige consentimento explícito.** Métricas agregadas podem ser mostradas à organização criadora. Perfil, contacto, entrega, projeto ou resultado individual só podem ser partilhados após opt-in específico, revogável e auditável.

10. **Uma VWX não é estágio, emprego ou promessa de contratação.** A comunicação e os contratos devem usar linguagem de experiência profissional digital, prática guiada e evidência de competências.

11. **A implementação será protegida por feature flag até ao primeiro fluxo E2E completo.** O tipo `vwx` não deve ser exposto publicamente enquanto builder, player, progresso, entrega, conclusão e credencial não estiverem integrados.

## Estrutura mínima de uma VWX

```text
VWX
├── Boas-vindas
├── Conhecer a empresa e a profissão
├── Masterclass ou contexto técnico
├── Briefing profissional
├── Tarefa prática
├── Checkpoint ou feedback automático
├── Projeto final
├── Debrief e resposta-modelo
├── Reflexão do participante
└── Opportunity Pathway opcional e consentido
```

Tipos iniciais de etapa:

- `conteudo`
- `tarefa`
- `simulacao`
- `checkpoint`
- `projeto_final`
- `debrief`
- `reflexao`
- `oportunidade`

## Invariantes

- O browser nunca declara conclusão, score ou elegibilidade de credencial sem validação server-side.
- A ordem e os pré-requisitos das etapas são validados no BFF.
- Uma etapa publicada não pode referenciar conteúdo inexistente ou não autorizado.
- A submissão mantém histórico de versões e audit trail.
- A empresa não vê dados individuais por defeito.
- Menores não entram em fluxos de oportunidade sem regras e consentimentos adequados.
- A VWX pode ser concluída sem IA; IA permanece uma camada opcional.
- A Experiência Curricular continua sempre gratuita.

## Consequências

### Positivas

- Preserva a taxonomia e a proposta original do PDC.
- Reutiliza autenticação, organizações, programas, conteúdos, projetos, telemetria e reputação.
- Permite jornadas empresariais, académicas e híbridas sem duplicar o produto.
- Cria uma fundação escalável para diferentes setores e mercados.
- Mantém os resultados do participante dentro do Perfil e Portfólio PDC.

### Custos e complexidade

- Programa deixa de ser apenas um content container e passa a possuir runtime próprio.
- São necessários novos schemas, rotas, player, progresso, entregas, rubricas e credenciais.
- Analytics, consentimento e moderação tornam-se mais granulares.
- A UI organizacional deve adaptar linguagem e capacidades ao tipo de organização.

## Alternativas rejeitadas

- **Reutilizar Experiência Curricular para VWX:** mistura “sentir um curso” com “executar trabalho guiado”, quebra validação e torna o schema excessivamente condicional.
- **Modelar VWX como Curso:** transforma a solução numa LMS, limita projetos e experiência profissional e confunde aprendizagem com evidência de trabalho.
- **Modelar VWX apenas como Simulação:** uma VWX contém contexto, pessoas, tarefas, projeto, feedback e oportunidade; uma simulação é apenas uma das possíveis etapas.
- **Criar aplicação VWX separada:** duplica o ecossistema e fragmenta perfil, reputação e dados de decisão.
- **Criar role `empresa` imediatamente:** a organização canónica já distingue o tipo empresarial; um novo role criaria migração e duplicação de RBAC sem benefício suficiente nesta fase.

## Migração e compatibilidade

1. Adicionar `vwx` ao enum de Programa em `@pdc/shared` e Strapi, sem alterar registos existentes.
2. Criar novas collections e relações de forma aditiva.
3. Manter rotas e tipos atuais de Programa compatíveis.
4. Introduzir `VWX_ENABLED=false` por defeito até ao DoD E2E.
5. Publicar templates e seeds apenas depois da validação do primeiro caso real.

## Validação da decisão

A decisão estará implementada quando:

- o contrato `ProgramaTipoSchema` aceitar `vwx` sob feature flag;
- uma organização do tipo empresa conseguir criar uma VWX em rascunho;
- um participante conseguir inscrever-se, executar etapas, submeter trabalho e concluir;
- o servidor calcular progresso e elegibilidade;
- uma credencial verificável de VWX for emitida;
- a empresa visualizar analytics agregados e apenas dados individuais consentidos;
- a Experiência Curricular continuar funcional e semanticamente inalterada.
