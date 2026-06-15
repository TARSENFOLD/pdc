# ADR-041 — Principais empregadores estruturados na Experiência

**Data:** 2026-06-14
**Estado:** Aceite
**Caixa:** C — contrato histórico e necessidade editorial divergentes

## Contexto

O Painel de Realidade persistia `principaisEmpregadores` como `string[]`. Esse
formato não representa setor, logótipo nem ligação oficial e impedia a landing
de apresentar empregadores com contexto verificável. O campo já é JSON no
Strapi, portanto não exige alteração do content type nem migração física.

Existem rascunhos locais e registos anteriores com strings. Rejeitá-los quebraria
a edição e o autosave; aceitá-los sem normalização manteria dois contratos.

## Decisão

1. O contrato canónico passa a ser:
   `{ nome: string; setor?: string; logoUrl?: URL; url?: URL }[]`.
2. `parsePainelRealidade` converte exclusivamente entradas legadas do tipo
   `string` em `{ nome: string }` antes de validar o schema canónico.
3. Objetos incompletos ou URLs inválidas continuam a falhar na validação.
4. O autosave usa o mesmo schema e reidrata rascunhos antigos já normalizados.
5. A persistência continua no JSON `painelRealidade`; não há alteração Strapi.
6. Experiências permanecem sempre gratuitas.

## Consequências

- Editor e landing usam uma única representação estruturada.
- Rascunhos antigos continuam editáveis sem esconder corrupção de dados.
- Logos e links oficiais podem ser apresentados com validação partilhada.
