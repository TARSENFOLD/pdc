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
  PROGRAMA_CRIADO = 'programa.criado',
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
  POST_PUBLICADO = 'post.published',
  POST_SUBMETIDO = 'post.submitted',
  CONQUISTA_DESBLOQUEADA = 'achievement.unlocked',
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

export const LtiEventPayloadSchema = z.object({
  tentativaId: z.string().min(1),
  score: z.number(),
  perfilId: z.string().min(1),
});

export type LtiEventPayload = z.infer<typeof LtiEventPayloadSchema>;

export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  name: z.nativeEnum(DomainEventName),
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  hookResults: z.record(
    z.string(), 
    z.object({
      status: z.enum(['sent', 'skipped', 'retryable_error', 'fatal_error']),
      reason: z.string().optional(),
      data: z.unknown().optional(),
    })
  ).optional(), // Resultados G15 persistidos
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

const BaseInteractionSchema = z.object({
  autorId: z.string(),
  targetId: z.string(),
});

const ContentPublishSchema = z.object({
  autorId: z.string(),
  titulo: z.string(),
  area: z.string().optional(),
});

/**
 * Map de Schemas por Evento para Validação E2E
 * Cobre exaustivamente os 49 eventos do ecossistema G15.
 */
export const EventPayloadSchemas: Record<string, z.ZodTypeAny> = {
  // --- Simulação ---
  [DomainEventName.TENTATIVA_INICIADA]: z.object({ tentativaId: z.string(), perfilId: z.string() }),
  [DomainEventName.TENTATIVA_CONCLUIDA]: z.object({ tentativaId: z.string(), perfilId: z.string(), area: z.string(), score: z.number() }),
  [DomainEventName.TENTATIVA_FALHADA]: z.object({ tentativaId: z.string(), perfilId: z.string(), reason: z.string().optional() }),
  [DomainEventName.SIMULACAO_CRIADA]: ContentPublishSchema.extend({ simulacaoId: z.string() }),
  [DomainEventName.SIMULACAO_PUBLICADA]: ContentPublishSchema.extend({ simulacaoId: z.string() }),
  [DomainEventName.SIMULACAO_APROVADA]: z.object({ simulacaoId: z.string(), aprovadorId: z.string() }),
  [DomainEventName.SIMULACAO_REJEITADA]: z.object({ simulacaoId: z.string(), rejeitadorId: z.string(), motivo: z.string().optional() }),

  // --- Curso ---
  [DomainEventName.CURSO_PUBLICADO]: ContentPublishSchema.extend({ cursoId: z.string(), regrasAcesso: z.record(z.unknown()).optional() }),
  [DomainEventName.CURSO_ATUALIZADO]: z.object({ cursoId: z.string(), autorId: z.string() }),
  [DomainEventName.CURSO_ARQUIVADO]: z.object({ cursoId: z.string(), autorId: z.string() }),
  [DomainEventName.CURSO_INSCRICAO]: z.object({ cursoId: z.string(), estudanteId: z.string() }),
  [DomainEventName.CURSO_MODULO_CONCLUIDO]: z.object({ cursoId: z.string(), moduloId: z.string(), estudanteId: z.string() }),
  [DomainEventName.CURSO_CONCLUIDO]: z.object({ cursoId: z.string(), estudanteId: z.string() }),

  // --- Experiência ---
  [DomainEventName.EXPERIENCIA_PUBLICADA]: ContentPublishSchema.extend({ experienciaId: z.string() }),
  [DomainEventName.EXPERIENCIA_VISUALIZADA]: BaseInteractionSchema.extend({ experienciaId: z.string() }),
  [DomainEventName.EXPERIENCIA_QA_RESPONDIDA]: z.object({ experienciaId: z.string(), perguntaId: z.string(), autorId: z.string() }),

  // --- Programa ---
  [DomainEventName.PROGRAMA_CRIADO]: ContentPublishSchema.extend({ programaId: z.string(), criadorTipo: z.string() }),
  [DomainEventName.PROGRAMA_PUBLICADO]: ContentPublishSchema.extend({ programaId: z.string(), instituicaoId: z.string() }),
  [DomainEventName.PROGRAMA_APROVADO]: z.object({ programaId: z.string(), aprovadorId: z.string() }),
  [DomainEventName.PROGRAMA_INSCRICAO]: z.object({ programaId: z.string(), estudanteId: z.string() }),
  [DomainEventName.PROGRAMA_CONVITE_ENVIADO]: z.object({ programaId: z.string(), estudanteId: z.string(), instituicaoId: z.string() }),
  [DomainEventName.PROGRAMA_CONVITE_ACEITE]: z.object({ programaId: z.string(), estudanteId: z.string() }),
  [DomainEventName.SHADOWAPRO_VINCULO_CRIADO]: z.object({ programaId: z.string(), estudanteId: z.string(), mentorId: z.string() }),
  [DomainEventName.EDUVISITA_AGENDADA]: z.object({ programaId: z.string(), instituicaoId: z.string(), data: z.string() }),

  // --- Projeto ---
  [DomainEventName.PROJETO_PUBLICADO]: ContentPublishSchema.extend({ projetoId: z.string() }),
  [DomainEventName.PROJETO_ACESSO_SOLICITADO]: BaseInteractionSchema.extend({ projetoId: z.string() }),
  [DomainEventName.PROJETO_ACESSO_CONCEDIDO]: BaseInteractionSchema.extend({ projetoId: z.string() }),
  [DomainEventName.PROJETO_ACESSO_RECUSADO]: BaseInteractionSchema.extend({ projetoId: z.string() }),
  [DomainEventName.PROJETO_COLABORADOR_ACEITE]: z.object({ projetoId: z.string(), autorId: z.string(), colaboradorId: z.string() }),
  [DomainEventName.PROJETO_ENDORSEMENT_RECEBIDO]: BaseInteractionSchema.extend({ projetoId: z.string() }),
  [DomainEventName.PROJETO_SELO_ATRIBUIDO]: z.object({ projetoId: z.string(), seloId: z.string(), avaliadorId: z.string() }),

  // --- Post/Conquista ---
  [DomainEventName.POST_PUBLICADO]: ContentPublishSchema.extend({ postId: z.string(), autorId: z.string() }),
  [DomainEventName.POST_SUBMETIDO]: ContentPublishSchema.extend({ postId: z.string(), autorId: z.string(), moderacaoRequerida: z.boolean() }),
  [DomainEventName.CONQUISTA_DESBLOQUEADA]: z.object({ perfilId: z.string(), conquistaSlug: z.string() }),
  [DomainEventName.COMENTARIO_CRIADO]: z.object({ autorId: z.string(), targetType: z.string(), targetId: z.string() }),
  [DomainEventName.LIKE_ADICIONADO]: z.object({ autorId: z.string(), targetType: z.string(), targetId: z.string() }),
  [DomainEventName.BOOKMARK_ADICIONADO]: z.object({ autorId: z.string(), targetType: z.string(), targetId: z.string() }),

  // --- Identidade ---
  [DomainEventName.PERFIL_CRIADO]: z.object({ perfilId: z.string(), role: z.string() }),
  [DomainEventName.PERFIL_ATUALIZADO]: z.object({ perfilId: z.string() }).passthrough(),
  [DomainEventName.PERFIL_ROLE_ALTERADO]: z.object({ perfilId: z.string(), oldRole: z.string(), newRole: z.string() }),
  [DomainEventName.PERFIL_SUSPENSO]: z.object({ perfilId: z.string(), reason: z.string().optional() }),
  [DomainEventName.LOGIN]: z.object({ userId: z.string(), ip: z.string().optional() }),
  [DomainEventName.LOGOUT]: z.object({ userId: z.string() }),
  [DomainEventName.MFA_ATIVADO]: z.object({ userId: z.string() }),
  [DomainEventName.OAUTH_VINCULADO]: z.object({ userId: z.string(), provider: z.string() }),

  // --- Vínculo ---
  [DomainEventName.VINCULO_SOLICITADO]: z.object({ solicitanteId: z.string(), destinatarioId: z.string() }),
  [DomainEventName.VINCULO_APROVADO]: z.object({ vinculoId: z.string(), solicitanteId: z.string(), destinatarioId: z.string() }),
  [DomainEventName.VINCULO_REJEITADO]: z.object({ vinculoId: z.string(), solicitanteId: z.string(), destinatarioId: z.string() }),
  [DomainEventName.VINCULO_TERMINADO]: z.object({ vinculoId: z.string(), atorId: z.string() }),
  [DomainEventName.VINCULO_CONNECTED]: z.object({ vinculoId: z.string(), solicitanteId: z.string(), destinatarioId: z.string() }),

  // --- Mentoria ---
  [DomainEventName.MENTORIA_SOLICITADA]: BaseInteractionSchema.extend({ mentoriaId: z.string() }),
  [DomainEventName.MENTORIA_ACEITE]: BaseInteractionSchema.extend({ mentoriaId: z.string() }),
  [DomainEventName.MENTORIA_REJEITADA]: BaseInteractionSchema.extend({ mentoriaId: z.string() }),

  // --- Ratings/Feed ---
  [DomainEventName.RATING_CRIADO]: z.object({ autorId: z.string(), targetType: z.string(), targetId: z.string(), score: z.number() }),
  [DomainEventName.PROPOSTA_CRIADA]: z.object({ propostaId: z.string(), estudanteId: z.string(), instituicaoId: z.string() }),
  [DomainEventName.PROGRAMA_CONCLUIDO]: z.object({ programaId: z.string(), estudanteId: z.string() }),

  // --- Mensagens ---
  [DomainEventName.MENSAGEM_ENVIADA]: z.object({ mensagemId: z.string(), conversaId: z.string(), remetenteId: z.string(), destinatarioId: z.string(), conteudo: z.string(), createdAt: z.string() }),
  [DomainEventName.MENSAGEM_LIDA]: z.object({ mensagemId: z.string(), leitorId: z.string(), conversaId: z.string() }),
  [DomainEventName.CONVERSA_INICIADA]: z.object({ conversaId: z.string(), participant1Id: z.string(), participant2Id: z.string() }),

  // --- Moderação ---
  [DomainEventName.DENUNCIA_CRIADA]: z.object({ autorId: z.string(), targetType: z.string(), targetId: z.string() }),
  [DomainEventName.DENUNCIA_RESOLVIDA]: z.object({ denunciaId: z.string(), resolutorId: z.string(), acao: z.string() }),
  [DomainEventName.CONTEUDO_REMOVIDO]: z.object({ targetType: z.string(), targetId: z.string(), remocaoId: z.string() }),
  [DomainEventName.COMITE_APROVOU]: z.object({ targetType: z.string(), targetId: z.string(), membroId: z.string() }),
  [DomainEventName.COMITE_REJEITOU]: z.object({ targetType: z.string(), targetId: z.string(), membroId: z.string() }),
  [DomainEventName.MODERADOR_APROVOU]: z.object({ targetType: z.string(), targetId: z.string(), moderadorId: z.string() }),
  [DomainEventName.MODERADOR_REJEITOU]: z.object({ targetType: z.string(), targetId: z.string(), moderadorId: z.string() }),

  // --- Mídia ---
  [DomainEventName.MEDIA_UPLOADED]: z.object({ mediaId: z.string(), uploaderId: z.string(), url: z.string() }),
  [DomainEventName.MEDIA_PROCESSED]: z.object({ mediaId: z.string(), url: z.string() }),
  [DomainEventName.MEDIA_FAILED]: z.object({ mediaId: z.string(), reason: z.string() }),
};
