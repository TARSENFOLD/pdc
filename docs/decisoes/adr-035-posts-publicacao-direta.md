# ADR-035 — Publicação direta de conteúdo comunitário

**Status:** Aceite  
**Data:** 2026-06-07

## Contexto

A regra anterior encaminhava automaticamente para moderação todos os posts de
contas com menos de sete dias. Isso criava fricção para novos utilizadores mesmo
quando o conteúdo não apresentava qualquer sinal concreto de risco.

## Decisão

Posts, comentários e projetos de perfis autenticados e aprovados são publicados
diretamente, independentemente da idade da conta.

O motor de risco continua a encaminhar para revisão conteúdo com sinais
concretos, incluindo links suspeitos, repetição excessiva, duplicação recente,
linguagem abusiva ou reputação negativa. Risco alto continua sujeito a ocultação
automática.

Pedidos de acesso ao núcleo privado de um projeto continuam pendentes até
aprovação do autor, porque representam autorização de acesso e não moderação de
conteúdo.

## Consequências

- Novos utilizadores podem participar imediatamente no feed e publicar projetos.
- A fila de moderação passa a refletir risco observável, não idade da conta.
- Denúncias e auto-hide continuam a proteger o feed após a publicação.
