// Enumeração Central dos Nomes de Eventos Críticos (SSOT)
export enum DomainEventName {
  TENTATIVA_CONCLUIDA = 'tentativa.concluida',
  CONQUISTA_DESBLOQUEADA = 'conquista.desbloqueada',
  COMENTARIO_CRIADO = 'comentario.criado',
  CURSO_CONCLUIDO = 'curso.concluido',
  RATING_CRIADO = 'rating.criado',
  LOGIN = 'login',
  MENTORIA_ACEITE = 'mentoria.aceite',
  EXPERIENCIA_PUBLICADA = 'experiencia.publicada',
  VINCULO_CONNECTED = 'vinculo.connected',
  PERFIL_ATUALIZADO = 'perfil.atualizado',
  SIMULACAO_CRIADA = 'simulacao.criada',
  CURSO_PUBLICADO = 'curso.publicado',
  CURSO_INSCRICAO = 'curso.inscricao',
}

// Estrutura Padronizada de um Domain Event (Approach §1.4)
export interface DomainEvent<T = unknown> {
  id: string; // Correlation ID (UUID)
  name: DomainEventName | string;
  payload: T;
  timestamp: string; // ISO 8601
}
