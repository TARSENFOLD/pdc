# Catálogo de Eventos de Telemetria

⚠️ **Nota:** Este documento apresenta um snapshot operacional simplificado. Para a autoridade completa sobre o catálogo de 30+ eventos, payloads detalhados e lógica de enriquecimento, consulte a Spec Canónica **1a81656f — Modelo de Telemetria e Perfil Vocacional** (ficheiro arquivado, consulte o gestor de projeto).

## Snapshot Operacional (W1)

| Evento | Descrição | Gatilho | Payload Principal |
| :--- | :--- | :--- | :--- |
| `simulacao.iniciada` | Início de uma prova | Clique em "Começar" | `simulacaoId` |
| `simulacao.concluida` | Término com sucesso | Submissão final | `score`, `tempoSegundos` |
| `questao.respondida` | Resposta a um item | Clique numa opção | `perguntaId`, `opcao`, `isCorrect` |
| `questao.hesitacao` | Demora excessiva | > 10s sem clique | `perguntaId`, `dwellTime` |
| `video.assistido` | Visualização de aula | A cada 25% de progresso | `cursoId`, `moduloId`, `percent` |
| `feed.scroll` | Consumo de conteúdo | Scroll > 50% da página | `tab`, `depth` |
| `visibility.lost` | Saída da aplicação | Aba minimizada ou trocada | `url`, `duration` |
| `login.success` | Sucesso na entrada | Login concluído | `provider` |

## Enriquecimento Automático
Cada evento capturado pelo hook `useTelemetry` é enriquecido com:
- `eventId`: UUID único (idempotência).
- `sessionId`: ID da sessão de browser.
- `url`: Path atual da aplicação.
- `visibilityState`: Estado de visibilidade do documento.
- `timestamp`: ISO string do momento da captura.

## Categorias de Eventos (Spec 1a81656f)
O catálogo completo divide-se em 6 categorias críticas para o cálculo vocacional:
1. **Navegação:** Rastreio do fluxo de interesse e exploração de áreas.
2. **Simulação:** O "fazer" técnico (T-1, T-2, T-3).
3. **Cursos:** Progresso académico e teórico.
4. **Experiências:** Exploração institucional e depoimentos.
5. **Decisão:** Eventos de bookmarking, likes e solicitação de vínculo.
6. **Interação Social:** Networking e feedback entre mentores/estudantes.
