# ADR-050 — Remoção do overlay bloqueante “Impacto Registado”

Data: 2026-07-06

## Estado

Aceite.

## Contexto

Em produção, após certas criações/publicações, a aplicação apresentava um overlay/página de confirmação com o texto “Impacto Registado” e CTA “Continuar para o Ecossistema”. A experiência bloqueava a navegação natural e não ajudava o utilizador a concluir tarefas operacionais como publicar, editar ou regressar à lista/detalhe.

O pedido de produto foi remover essa página. A telemetria/eventos do ecossistema continuam a ser responsabilidade do BFF/outbox/hooks; a UI não deve bloquear o utilizador para mostrar contadores internos.

## Decisão

Remover `EcosystemImpactPanel` dos fluxos de criação/publicação e eliminar o componente do bundle web.

Os fluxos passam a navegar diretamente para o destino funcional após sucesso:

- projeto → detalhe/lista de projetos;
- conquista → `/app/conquistas`;
- programa → `/app/instituicao/programas`;
- curso → cursos do mentor ou dashboard institucional;
- simulação → `/app/mentor/simulacoes`.

## Consequências

- A página/overlay “Impacto Registado” deixa de aparecer em produção.
- O pipeline G15 continua no servidor, sem depender de confirmação visual bloqueante no cliente.
- Qualquer visualização futura de impacto deve ser não-bloqueante, contextual e reintroduzida com novo ADR/UX validado.
