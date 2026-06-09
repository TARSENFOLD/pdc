# ADR-036 — Instituição como fonte canónica organizacional

**Estado:** Aceite
**Data:** 2026-06-08
**Caixa:** C — documentação e implementação incompletas e divergentes

## Contexto

O perfil com `tipo = instituicao` mistura identidade do utilizador gestor com dados da
organização. O content-type `instituicao` já existe, mas não contém o workflow formal,
dados territoriais estruturados nem separação completa entre informação pública e
documentos privados.

## Decisão

1. `instituicao` é a fonte canónica dos dados organizacionais.
2. `perfil` representa uma pessoa gestora e referencia uma instituição.
3. A evolução do Strapi é aditiva. Campos legados permanecem disponíveis durante a
   migração e a leitura mantém fallback explícito.
4. O estado institucional é `draft`, `pending_review`, `changes_requested`,
   `verified` ou `suspended`.
5. NIF completo, representante e documentos legais são privados. O serializer público
   expõe apenas estado, `verificada` e selos públicos.
6. Documentos binários ficam no R2; o Strapi guarda metadados, chave, tipo, estado de
   análise e relação institucional.
7. Cursos, programas e experiências permanecem relações com content-types existentes.
8. Angola é a primeira jurisdição. O endereço usa as 21 províncias vigentes e não exige
   código postal. Registos legados de Cuando Cubango exigem confirmação manual.
9. O NIF recebe apenas validação básica de formato e confirmação documental. Não é
   assumido um algoritmo oficial não integrado.
10. Escritas institucionais emitem eventos para os seis hooks ou outbox.

## Autorização

- Gestores institucionais editam somente a instituição associada ao seu JWT/perfil.
- `super_admin` analisa documentos e altera o estado de verificação.
- O backend aplica filtragem por campo; privacidade não depende do frontend.
- `requireApproved` consulta o estado canónico da instituição para a role
  `instituicao`, mantendo fallback temporário para perfis de mentor.

## Migração

Uma migração idempotente deve criar instituições ausentes, ligar o perfil gestor e
copiar nome, região, natureza, documentos e média sem alterar slugs ou URLs públicas.
Falhas parciais ficam registadas para retry. A remoção dos campos duplicados requer
novo ADR após métricas confirmarem o fim das leituras legadas.

## Consequências

O editor pode salvar secções independentemente e a API pública ganha um contrato
seguro. Durante a transição há duplicação controlada e maior complexidade de leitura,
preferível a uma migração destrutiva.
