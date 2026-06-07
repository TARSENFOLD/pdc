# ADR-035 — Publicação direta de posts

**Status:** Aceite  
**Data:** 2026-06-07

## Contexto

A regra anterior encaminhava automaticamente para moderação todos os posts de
contas com menos de sete dias. Isso criava fricção para novos utilizadores mesmo
quando o conteúdo não apresentava qualquer sinal concreto de risco.

## Decisão

Posts de perfis autenticados e aprovados são publicados diretamente,
independentemente da idade da conta.

O motor de risco continua a encaminhar para revisão conteúdo com sinais
concretos, incluindo links suspeitos, repetição excessiva, duplicação recente,
linguagem abusiva ou reputação negativa. Risco alto continua sujeito a ocultação
automática.

Esta decisão não altera as regras de moderação de comentários ou projetos.

## Consequências

- Novos utilizadores podem participar imediatamente no feed.
- A fila de moderação passa a refletir risco observável, não idade da conta.
- Denúncias e auto-hide continuam a proteger o feed após a publicação.
