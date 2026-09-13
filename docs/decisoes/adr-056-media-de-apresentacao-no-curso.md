# ADR-056: Mídia de apresentação no currículo e no player de Curso

- Estado: aceite
- Data: 2026-09-03
- Caixa: C
- Relação: COR-0304, COR-0305

## Contexto

O contrato canónico de Curso define a hierarquia `Curso → Módulos → Itens` e
reconhece vídeo como um tipo de item. O builder e o player, porém, tratavam
vídeo, texto e restantes formatos como blocos independentes sem uma regra de
composição visual. Também não existia uma forma tipada de associar imagens de
apoio a uma aula.

A experiência de consumo aprovada exige que o vídeo introduza o módulo, sem
repetição, e que as imagens de uma aula apareçam antes do seu corpo. Quando há
mais de uma imagem, elas formam uma galeria horizontal. Imagens não são aulas,
não aparecem como itens de navegação e não alteram o cálculo de progresso.

## Decisão

1. Cada módulo pode conter no máximo um item com `tipo=video`.
2. O item de vídeo, quando existe, ocupa sempre a primeira posição do módulo.
3. A ordem é aplicada no builder e validada pelo contrato partilhado; o BFF não
   persiste módulos que violem a regra.
4. Cada item pode possuir `imagens[]`, uma lista ordenada e opcional de objetos
   com `url` e `alt` obrigatórios.
5. A galeria pertence ao item, não cria uma rota, não aparece no currículo e
   não conta para conclusão ou progresso.
6. No player, a galeria é apresentada antes do conteúdo principal do item. Uma
   única imagem ocupa a área de apresentação; múltiplas imagens usam uma faixa
   horizontal com scroll e snap.
7. No builder, o criador vê a ordem de consumo, pode adicionar, descrever,
   reordenar e remover imagens, e não consegue adicionar um segundo vídeo.
8. URLs e textos alternativos são persistidos no campo JSON `imagens` do
   `modulo-item`; o mesmo schema partilhado valida a escrita e a prontidão de
   publicação, inclusive dados legados malformados, sem depender de casts do
   Strapi. Conteúdo protegido não expõe a galeria no DTO público bloqueado.

## Consequências

- A interface de criação corresponde à composição vista pelo estudante.
- A galeria não fragmenta a navegação nem adultera métricas de progresso.
- Cursos existentes continuam válidos porque `imagens` é opcional.
- Rascunhos existentes com vídeo fora da primeira posição são normalizados ao
  abrir no builder antes da próxima gravação.
- COR-0305 continua responsável por separar definitivamente os DTOs público,
  learner, autor e revisão; até lá, o bloqueio existente remove também imagens.

## Validação

- Shared rejeita mais de um vídeo e vídeo fora da primeira posição.
- Testes do builder cobrem indisponibilidade do segundo vídeo e inserção na
  primeira posição.
- Testes do BFF cobrem persistência da galeria e remoção em payload bloqueado.
- Testes do player cobrem imagem única e galeria horizontal antes do conteúdo.
- Typecheck, lint, testes de Shared/API/Web e validação visual devem passar
  antes do commit.
