import { z } from 'zod';

export const TelemetriaTipoSchema = z.enum([
  'simulacao.iniciada',
  'simulacao.concluida',
  'simulacao.tipo2.iniciada',
  'simulacao.tipo2.concluida',
  'simulacao.foco.perdido',
  'experience.detail.view',
  'experience.curriculum.dwell',
  'vinculos.page_view',
  'video.assistido',
  'checklist.item_marcado',
  'iframe.sessao',
  'curso.item_concluido',
  'landing_hero_started',
  'landing_hero_area_detected',
  'landing_hero_verdict_generated',
  'landing_hero_verdict_failed',
  'page.viewed',
  'curso.detail_viewed',
  'dashboard.viewed',
  'vinculos.viewed',
  'vinculos.action',
  'login.success',
  'simulacao.abandonada', 
  'questao.respondida', 
  'questao.hesitacao', 
  'experiencia.visualizada', 
  'experiencia.timeline_click', 
  'mentor.contactado', 
  'mentor.perfil_visualizado', 
  'pesquisa.realizada', 
  'projeto.criado', 
  'projeto.publicado', 
  'perfil.atualizado', 
  'perfil.visualizado', 
  'ranking.visualizado', 
  'conquista.partilhada', 
  'notificacao.vista', 
  'notificacao.clicada', 
  'feed.scroll', 
  'feed.interacao', 
  'curso.concluido', 
  'curso.publicado', 
  'curso.inscricao', 
  'simulacao.criada', 
  'rating.criado', 
  'comentario.criado', 
  'mentoria.aceite', 
  'experiencia.publicada', 
  'vinculo.connected', 
  'visibility.lost', 
  'visibility.gained', 
  'session.started'
]);
export type TelemetriaTipo = z.infer<typeof TelemetriaTipoSchema>;

export const TelemetriaEventoSchema = z.object({
  eventId: z.string().uuid(),
  tipo: TelemetriaTipoSchema,
  payload: z.record(z.unknown()).optional().default({}),
  timestamp: z.string(),
  clientTimestamp: z.number().optional(), // Precisão para algoritmo Phi
  sessionId: z.string().optional(),
  correlationId: z.string().optional(),
  url: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  visibilityState: z.string().optional(),
});
export type TelemetriaEvento = z.infer<typeof TelemetriaEventoSchema>;

export const TelemetriaBatchSchema = z.object({
  events: z.array(TelemetriaEventoSchema).min(1).max(100),
});
export type TelemetriaBatch = z.infer<typeof TelemetriaBatchSchema>;
