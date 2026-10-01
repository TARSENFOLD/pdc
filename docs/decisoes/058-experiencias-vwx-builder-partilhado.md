# ADR-058 — Experiências e VWX: builder e catálogo partilhados

Data: 2026-09-26. Caixa C: contrato e implementação incompletos.

## Decisão autorizada

O fundador autorizou nesta tarefa um builder e catálogo comuns, com regras próprias
para Experiência institucional e VWX. O trabalho fica na branch
`codex/experiencias-vwx-e2e`, sem alterações a Cursos.

Experiência mantém a definição da spec 04 §3.1: apresentação gratuita de uma
formação numa instituição, painéis de realidade, vozes e guia institucional.
VWX mantém o percurso dos documentos fornecidos pelo fundador
`VWX_Proposta_Colaboracao_Final.pdf` e `PDC _ Digital Work Experience.pdf`:
contexto, briefing, exploração, prática, entregável, debrief e reflexão.
Partilhar persistência não altera esta distinção de produto.

## Contrato e operação

- `tipoExperiencia` é `institucional` ou `vwx`; registos legados sem tipo são institucionais.
- O tipo fica fixo depois de criar; campos e secções incompatíveis são rejeitados pelo BFF.
- VWX é produzida pelo PDC (super_admin). Instituições e mentores criam Experiências.
- A aprovação do parceiro VWX é registada pelo PDC com responsável e referência
  da evidência; é privada, invalidada por edição e obrigatória para publicar.
- As flags existentes continuam a controlar acesso externo e exposição VWX.
- Guardar mantém a pessoa no editor e usa documentId estável. Não deduplicar por título.
- Rascunho, revisão, aprovação e publicação usam as versões reais do Strapi.
- Catálogo filtra o tipo antes da paginação. Detalhes aceitam slug e documentId.
- Participação é idempotente. VWX permite guardar progresso, entregável em texto
  ou link, e reflexão. Conclusão exige todas as etapas, entrega e reflexão.
- Respostas do participante são privadas. Nenhuma certificação ou emprego é prometido.
- Upload e reprodução reutilizam a infraestrutura existente. Conteúdo já disponível
  será preservado; exemplos de teste são identificados e ficam no ambiente de teste.

## Compatibilidade e segurança

- A ADR-037 torna as secções modulares a estrutura editorial. O lifecycle Strapi
  passa a reconhecer os seis grupos institucionais ou as sete etapas VWX, em vez
  de exigir sempre os três painéis legados. Registos antigos sem secções mantêm
  a validação anterior. Nenhum conteúdo existente é eliminado ou convertido em VWX.
- A validação também corre ao criar uma versão publicada no Strapi 5.
- Um lock por documentId serializa edição, validação do parceiro e publicação;
  o conteúdo é relido dentro do lock antes de verificar autoridade e estado.
- A lista pública e o detalhe omitem secções reservadas. O participante autenticado
  recebe apenas a própria participação e os conteúdos do percurso a que aderiu.
- Rascunhos locais são separados por utilizador e tipo. O rascunho legado é
  recuperado, incluindo empregadores antes guardados como strings. A recuperação
  aceita campos incompletos; guardar no servidor mantém a validação integral.
- As avaliações passam a usar o mesmo documentId estável do catálogo e do detalhe.
- Inscrição e conclusão reconstituem eventos em falta ao repetir ou reabrir a
  participação, com identidade estável e verificação do outbox persistente.
- Arquivar retira a versão pública mesmo quando existe um rascunho posterior
  incompleto. A retirada não exige completar novamente o conteúdo.
- A fila editorial consulta os rascunhos de Experiências e encaminha a revisão
  para o editor; mentores e administradores encontram a gestão nos seus menus.

## Validação

Contratos, RBAC, isolamento entre tipos, publicação, filtros, persistência e
retoma são cobertos por testes. E2E usa Strapi/PostgreSQL reais em ambiente local.
Deploy e conteúdo de produção só são declarados verificados após execução real.
