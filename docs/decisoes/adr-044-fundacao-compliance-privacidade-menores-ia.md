# ADR 044 - Fundação de compliance para privacidade, menores e IA

## Estado

Aceite em 2026-06-22.

## Contexto

A análise de conformidade identificou quatro lacunas de fundação:

- registo sem consentimentos versionados;
- perfil sem data de nascimento nem estado de menoridade;
- ausência de coleção para documentos legais versionados;
- perfil vocacional persistido sem versão de modelo, heurísticas ou explicabilidade.

O código existente já tinha RBAC, auditoria e privacidade por campo, mas não tinha
um modelo persistente para provar aceite legal, reconsentimento ou menoridade.
Esta divergência é Caixa C: as specs declaram privacidade e governança como lei,
mas o modelo de dados ainda não suportava a prova operacional.

## Decisão

- `@pdc/shared` passa a expor contratos canónicos de compliance:
  `AceiteLegal`, `ConsentimentoEncarregado`, `EstadoMenoridade`,
  `ConsentimentoEstado` e versões do perfil vocacional.
- `perfil` recebe campos aditivos para `dataNascimento`, `estadoMenoridade`,
  `consentimentoEstado`, `consents`, versões legais aceites e consentimento do encarregado.
- São criadas coleções Strapi `documento-legal` e `consentimento`.
- Consentimentos usam escrita híbrida: estado atual em `perfil.consents` e
  histórico append-only em `consentimento`, encapsulado no `consentService`.
- O registo por email persiste consentimentos legais; estudantes menores exigem
  consentimento do encarregado no contrato partilhado.
- OAuth cria perfil com compliance pendente e `onboardingCompleto=false`, porque
  o provider externo não fornece DOB nem aceite legal PDC.
- `isMinor` é derivado no servidor e propagado no JWT como eixo separado de RBAC.
- `perfil-vocacional` recebe `modelVersion`, `heuristicsVersion`,
  `explanationVersion`, `generatedWithAiSupport` e `calculationMethod`.

## Consequências

Este slice não implementa ainda reconsentimento no login, exportação/apagamento
de dados, revogação B2B, banner de cookies ou UI completa de transparência de IA.
Ele cria a fundação de dados para esses fluxos sem alterar a telemetria L1.

Novas contas por email passam a depender de aceite legal explícito. Contas OAuth
ficam sinalizadas como pendentes para uma etapa posterior de onboarding legal.
