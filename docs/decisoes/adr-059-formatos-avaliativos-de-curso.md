# ADR-059: Bloqueio de formatos avaliativos incompletos no Curso

- Estado: aceite
- Data: 2026-09-08
- Caixa: C
- Relação: COR-0304, fluxo funcional de criação e consumo

## Contexto

O contrato histórico reconhece itens `quiz` e `tarefa`, mas ainda não define as
perguntas, respostas, tentativas, entregas, critérios de conclusão e avaliação
necessários para um fluxo funcional completo. Um campo de texto livre não pode
representar esses domínios nem sustentar critérios de prontidão para publicação.

## Decisão

1. `quiz` e `tarefa` permanecem reconhecidos no contrato para leitura e edição de
   rascunhos legados.
2. O builder não permite criar novos itens desses formatos enquanto os respetivos
   slices tipados não existirem nas cinco camadas.
3. A prontidão do curso bloqueia a publicação de qualquer rascunho que ainda
   contenha esses formatos e apresenta uma mensagem explícita ao criador.
4. Vídeo, texto, PDF e conteúdo externo mantêm o fluxo de criação e consumo atual.
5. A ativação futura exige contrato partilhado, editor, BFF, persistência,
   conclusão pelo estudante, moderação e testes E2E próprios.

## Consequências

- Um curso não pode ser publicado com avaliações apenas aparentes.
- Não se inventa um modelo transitório incompatível com o domínio final.
- Rascunhos legados não são apagados e podem ser convertidos para formatos já
  suportados.
