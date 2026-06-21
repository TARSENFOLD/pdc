# ADR-039 — Migração aditiva de mensagens para conversas

**Data:** 2026-06-14
**Estado:** Aceite
**Caixa:** C — relação canónica ausente em dados históricos

## Contexto

O domínio de mensagens passou a exigir uma conversa canónica por par de perfis.
Tornar a relação `mensagem.conversa` obrigatória imediatamente quebraria linhas
históricas criadas antes desse modelo.

## Decisão

1. A relação `mensagem.conversa` é introduzida inicialmente como opcional.
2. O script idempotente `migrate-mensagem-conversas.ts`:
   - ignora mensagens já migradas;
   - normaliza o par de participantes;
   - reutiliza ou cria a conversa por `participantsKey`;
   - liga a mensagem à conversa;
   - falha explicitamente se existirem mensagens sem participantes válidos.
3. `required: true` só será ativado depois de o relatório indicar zero falhas e
   uma auditoria confirmar zero mensagens sem conversa.

## Consequências

- O deploy de schema não invalida dados existentes.
- Novas mensagens continuam a exigir conversa no BFF.
- O endurecimento da constraint fica dependente de evidência de migração.
