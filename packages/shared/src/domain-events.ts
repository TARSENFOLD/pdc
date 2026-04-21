import { z } from 'zod';

/**
 * Taxonomia Completa de Domain Events (SSOT) - G15
 * Total: 49 eventos canónicos que regem o ecossistema.
 */
export enum DomainEventName {
  // --- Simulação ---
  TENTATIVA_INICIADA = 'tentativa.iniciada',
  TENTATIVA_CONCLUIDA = 'tentativa.concluida',
  TENTATIVA_FALHADA = 'tentativa.falhada',
  SIMULACAO_CRIADA = 'simulacao.criada',
  SIMULACAO_PUBLICADA = 'simulacao.publicada', // Após Comité
  SIMULACAO_APROVADA = 'simulacao.aprovada',   // Comité
  SIMULACAO_REJEITADA = 'simulacao.rejeitada', // Comité

  // --- Curso ---
  CURSO_PUBLICADO = 'curso.publicado',
  CURSO_ATUALIZADO = 'curso.atualizado',
  CURSO_ARQUIVADO = 'curso.arquivado',
  CURSO_INSCRICAO = 'curso.inscricao',
  CURSO_MODULO_CONCLUIDO = 'curso.modulo.concluido',
  CURSO_CONCLUIDO = 'curso.concluido',

  // --- Experiência ---
  EXPERIENCIA_PUBLICADA = 'experiencia.publicada',
  EXPERIENCIA_VISUALIZADA = 'experiencia.visualizada',
  EXPERIENCIA_QA_RESPONDIDA = 'experiencia.qa.respondida',

  // --- Programa ---
  PROGRAMA_PUBLICADO = 'programa.publicado',
  PROGRAMA_APROVADO = 'programa.aprovado', // Moderador
  PROGRAMA_INSCRICAO = 'programa.inscricao',
  PROGRAMA_CONVITE_ENVIADO = 'programa.convite_enviado',
  PROGRAMA_CONVITE_ACEITE = 'programa.convite_aceite',
  SHADOWAPRO_VINCULO_CRIADO = 'shadowapro.vinculo_criado',
  EDUVISITA_AGENDADA = 'eduvisita.agendada',

  // --- Projeto ---
  PROJETO_PUBLICADO = 'projeto.publicado',
  PROJETO_ACESSO_SOLICITADO = 'projeto.acesso_solicitado',
  PROJETO_ACESSO_CONCEDIDO = 'projeto.acesso_concedido',
  PROJETO_ACESSO_RECUSADO = 'projeto.acesso_recusado',
  PROJETO_COLABORADOR_ACEITE = 'projeto.colaborador_aceite',
  PROJETO_ENDORSEMENT_RECEBIDO = 'projeto.endorsement_recebido',
  PROJETO_SELO_ATRIBUIDO = 'projeto.selo_atribuido',

  // --- Post/Conquista ---
  POST_PUBLICADO = 'post.publicado',
  CONQUISTA_DESBLOQUEADA = 'conquista.desbloqueada',
  COMENTARIO_CRIADO = 'comentario.criado',
  LIKE_ADICIONADO = 'like.adicionado',
  BOOKMARK_ADICIONADO = 'bookmark.adicionado',

  // --- Identidade ---
  PERFIL_CRIADO = 'perfil.criado',
  PERFIL_ATUALIZADO = 'perfil.atualizado',
  PERFIL_ROLE_ALTERADO = 'perfil.role_alterado',
  PERFIL_SUSPENSO = 'perfil.suspenso',
  LOGIN = 'login',
  LOGOUT = 'logout',
  MFA_ATIVADO = 'mfa.ativado',
  OAUTH_VINCULADO = 'oauth.vinculado',

  // --- Vínculo ---
  VINCULO_SOLICITADO = 'vinculo.solicitado',
  VINCULO_APROVADO = 'vinculo.aprovado',
  VINCULO_REJEITADO = 'vinculo.rejeitado',
  VINCULO_TERMINADO = 'vinculo.terminado',
  VINCULO_CONNECTED = 'vinculo.connected',

  // --- Mentoria ---
  MENTORIA_SOLICITADA = 'mentoria.solicitada',
  MENTORIA_ACEITE = 'mentoria.aceite',
  MENTORIA_REJEITADA = 'mentoria.rejeitada',

  // --- Ratings/Feed ---
  RATING_CRIADO = 'rating.criado',
  PROPOSTA_CRIADA = 'proposta.criada',
  PROGRAMA_CONCLUIDO = 'programa.concluido',

  // --- Mensagens ---
  MENSAGEM_ENVIADA = 'mensagem.enviada',
  MENSAGEM_LIDA = 'mensagem.lida',
  CONVERSA_INICIADA = 'conversa.iniciada',

  // --- Moderação ---
  DENUNCIA_CRIADA = 'denuncia.criada',
  DENUNCIA_RESOLVIDA = 'denuncia.resolvida',
  CONTEUDO_REMOVIDO = 'conteudo.removido',
  COMITE_APROVOU = 'comite.aprovou',
  COMITE_REJEITOU = 'comite.rejeitou',
  MODERADOR_APROVOU = 'moderador.aprovou',
  MODERADOR_REJEITOU = 'moderador.rejeitou',

  // --- Mídia ---
  MEDIA_UPLOADED = 'media.uploaded',
  MEDIA_PROCESSED = 'media.processed',
  MEDIA_FAILED = 'media.failed',
}

export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  name: z.nativeEnum(DomainEventName),
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Payload base para eventos que envolvem um ator (estudante, mentor, inst).
 */
export interface BaseDomainEventPayload {
  perfilId?: string | number;
  autorId?: string | number;
  userId?: string | number;
  tentativaId?: string | number;
  id?: string | number;
  [key: string]: unknown;
}

/**
 * Payload para eventos que geram entradas no feed.
 */
export interface FeedEventPayload extends BaseDomainEventPayload {
  instituicaoId?: string | number;
  cursoId?: string | number;
  simulacaoId?: string | number;
  id?: string | number;
  titulo?: string;
  descricao?: string;
  conteudo?: string;
  area?: string;
}

export type DomainEvent<TPayload = unknown> = z.infer<typeof DomainEventSchema> & {
  payload: TPayload;
};

/**
 * Map de Schemas por Evento para Validação E2E
 */
export const EventPayloadSchemas: Record<string, z.ZodTypeAny> = {
  [DomainEventName.CURSO_PUBLICADO]: z.object({
    cursoId: z.string(),
    autorId: z.string(),
    titulo: z.string(),
    area: z.string(),
  }),
  [DomainEventName.TENTATIVA_CONCLUIDA]: z.object({
    tentativaId: z.string(),
    perfilId: z.string(),
    area: z.string(),
    score: z.number(),
  }),
  // ... adicionar conforme necessário para cada feature E2E
};
