import { z } from 'zod';

// ─── Roles ────────────────────────────────────────────────────────────────────

export const RoleSchema = z.enum([
  'aluno',
  'mentor',
  'instituicao',
  'moderador',
  'comite_cientifico',
  'super_admin',
]);

export type Role = z.infer<typeof RoleSchema>;

// ─── Utilizador / Perfil ──────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  nome: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

export const PerfilPublicoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  role: RoleSchema,
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
});

export type PerfilPublico = z.infer<typeof PerfilPublicoSchema>;

export const PerfilCompletoSchema = UserSchema.extend({
  bio: z.string().optional(),
  telefone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  instituicaoId: z.string().optional(),
});

export type PerfilCompleto = z.infer<typeof PerfilCompletoSchema>;

export const UpdatePerfilPayloadSchema = z.object({
  nome: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  telefone: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export type UpdatePerfilPayload = z.infer<typeof UpdatePerfilPayloadSchema>;

// ─── Editorial ────────────────────────────────────────────────────────────────

export const EstadoEditorialSchema = z.enum(['draft', 'review', 'published', 'rejected']);
export type EstadoEditorial = z.infer<typeof EstadoEditorialSchema>;

// ─── Cursos ───────────────────────────────────────────────────────────────────

export const ItemModuloSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  tipo: z.enum(['video', 'pdf', 'texto', 'quiz', 'tarefa', 'iframe']),
  conteudo: z.string().optional(),
  ordem: z.number(),
  duracaoMinutos: z.number().optional(),
});

export type ItemModulo = z.infer<typeof ItemModuloSchema>;

export const ModuloSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().optional(),
  ordem: z.number(),
  itens: z.array(ItemModuloSchema),
});

export type Modulo = z.infer<typeof ModuloSchema>;

export const CursoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  autorId: z.string(),
  modulos: z.array(ModuloSchema).optional(),
  totalHoras: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Curso = z.infer<typeof CursoSchema>;

export const CriarCursoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  area: z.string().min(2).max(100),
  nivel: z.string().min(2).max(100),
  capaUrl: z.string().url().optional(),
  preco: z.number().min(0).optional(),
  visibilidade: z.enum(['publico', 'privado']).optional(),
});

export type CriarCursoPayload = z.infer<typeof CriarCursoPayloadSchema>;

export const CursoMeuSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: z.string().optional(),
  nivel: z.string().optional(),
  idioma: z.string().optional(),
  gratuito: z.boolean().optional(),
  totalHoras: z.number(),
  autorNome: z.string().optional(),
  estado: EstadoEditorialSchema,
  autorId: z.string(),
  inscritosCount: z.number().optional(),
});






export type CursoMeu = z.infer<typeof CursoMeuSchema>;

export const InscricaoSchema = z.object({
  id: z.string(),
  cursoId: z.string(),
  alunoId: z.string(),
  dataInscricao: z.string().datetime(),
  concluido: z.boolean(),
  dataConclusao: z.string().datetime().optional(),
  progressoPercentagem: z.number().min(0).max(100),
});

export type Inscricao = z.infer<typeof InscricaoSchema>;

export const InscricaoComCursoSchema = InscricaoSchema.extend({
  curso: CursoSchema.optional(),
});

export type InscricaoComCurso = z.infer<typeof InscricaoComCursoSchema>;

export const ProgressoItemSchema = z.object({
  itemId: z.string(),
  concluido: z.boolean(),
  dataConclusao: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional(),
});

export type ProgressoItem = z.infer<typeof ProgressoItemSchema>;

// ─── Simulações ───────────────────────────────────────────────────────────────

export const SimulacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  capaUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  iframeUrl: z.string().url().optional(),
});

export type Simulacao = z.infer<typeof SimulacaoSchema>;

export const CriarSimulacaoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  area: z.string().min(2).max(100),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  capaUrl: z.string().url().optional(),
  iframeUrl: z.string().url().optional(),
});

export type CriarSimulacaoPayload = z.infer<typeof CriarSimulacaoPayloadSchema>;

export const SimulacaoMinhaSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: z.string().optional(),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  nivel: z.string().optional(),
  estado: EstadoEditorialSchema,
  autorId: z.string(),
});





export type SimulacaoMinha = z.infer<typeof SimulacaoMinhaSchema>;

export const TentativaSchema = z.object({
  id: z.string(),
  simulacaoId: z.string(),
  alunoId: z.string(),
  eventId: z.string(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Tentativa = z.infer<typeof TentativaSchema>;

export const IniciarTentativaPayloadSchema = z.object({
  simulacaoId: z.string(),
});

export type IniciarTentativaPayload = z.infer<typeof IniciarTentativaPayloadSchema>;

export const ConcluirTentativaPayloadSchema = z.object({
  tentativaId: z.string(),
  score: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ConcluirTentativaPayload = z.infer<typeof ConcluirTentativaPayloadSchema>;

// ─── Experiências ─────────────────────────────────────────────────────────────

export const ExperienciaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  instituicaoId: z.string(),
  dataInicio: z.string().datetime(),
  dataFim: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type Experiencia = z.infer<typeof ExperienciaSchema>;

export const ModalidadeSchema = z.enum(['presencial', 'remoto', 'hibrido']);
export type Modalidade = z.infer<typeof ModalidadeSchema>;

export const CriarExperienciaPayloadSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(10),
  area: z.string().min(2).max(100),
  vagas: z.number().int().min(1).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  localizacao: z.string().max(200).optional(),
  modalidade: ModalidadeSchema,
});

export type CriarExperienciaPayload = z.infer<typeof CriarExperienciaPayloadSchema>;

export const ExperienciaMinhaSchema = ExperienciaSchema.extend({
  estado: EstadoEditorialSchema,
  area: z.string().optional(),
  vagas: z.number().optional(),
  modalidade: ModalidadeSchema.optional(),
  inscricoesCount: z.number().optional(),
});

export type ExperienciaMinha = z.infer<typeof ExperienciaMinhaSchema>;

// ─── Programas ────────────────────────────────────────────────────────────────

export const ProgramaTipoSchema = z.enum(['standard', 'shadowapro', 'eduvisit']);
export type ProgramaTipo = z.infer<typeof ProgramaTipoSchema>;

export const ProgramaSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  area: z.string().optional(),
  tipo: ProgramaTipoSchema,
  vagas: z.number().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  estado: EstadoEditorialSchema,
  autorId: z.string(),
  profissionalShadow: z.string().optional(),
  areaShadowing: z.string().optional(),
  visitaUrl: z.string().url().optional(),
  localizacaoFisica: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Programa = z.infer<typeof ProgramaSchema>;

export const CriarProgramaPayloadSchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: z.string().min(10),
  area: z.string().min(2).max(100),
  tipo: ProgramaTipoSchema,
  vagas: z.number().int().min(1).optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  profissionalShadow: z.string().max(200).optional(),
  areaShadowing: z.string().max(200).optional(),
  visitaUrl: z.string().url().optional(),
  localizacaoFisica: z.string().max(300).optional(),
});

export type CriarProgramaPayload = z.infer<typeof CriarProgramaPayloadSchema>;

// ─── Propostas ────────────────────────────────────────────────────────────────

export const PropostaEstadoSchema = z.enum(['pendente', 'aceite', 'recusada']);
export type PropostaEstado = z.infer<typeof PropostaEstadoSchema>;

export const PropostaTipoSchema = z.enum(['experiencia', 'programa', 'bolsa']);
export type PropostaTipo = z.infer<typeof PropostaTipoSchema>;

export const PropostaSchema = z.object({
  id: z.string(),
  instituicaoId: z.string(),
  estudanteId: z.string(),
  mensagem: z.string(),
  tipo: PropostaTipoSchema,
  estado: PropostaEstadoSchema,
  estudanteNome: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Proposta = z.infer<typeof PropostaSchema>;

export const CriarPropostaPayloadSchema = z.object({
  estudanteId: z.string().min(1),
  mensagem: z.string().min(10).max(1000),
  tipo: PropostaTipoSchema,
});

export type CriarPropostaPayload = z.infer<typeof CriarPropostaPayloadSchema>;

// ─── Notificações ─────────────────────────────────────────────────────────────

export const NotificacaoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  mensagem: z.string(),
  lida: z.boolean(),
  tipo: z.string(),
  link: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type Notificacao = z.infer<typeof NotificacaoSchema>;

export const ContadorNotificacoesSchema = z.object({
  total: z.number(),
  naoLidas: z.number(),
});

export type ContadorNotificacoes = z.infer<typeof ContadorNotificacoesSchema>;

// ─── Mensagens ────────────────────────────────────────────────────────────────

export const MensagemSchema = z.object({
  id: z.string(),
  conversaId: z.string(),
  remetenteId: z.string(),
  conteudo: z.string(),
  lida: z.boolean(),
  createdAt: z.string().datetime(),
});

export type Mensagem = z.infer<typeof MensagemSchema>;

export const ConversaSchema = z.object({
  id: z.string(),
  participantes: z.array(PerfilPublicoSchema),
  ultimaMensagem: MensagemSchema.optional(),
  updatedAt: z.string().datetime(),
});

export type Conversa = z.infer<typeof ConversaSchema>;

// ─── Media / Upload ───────────────────────────────────────────────────────────

export const UploadResultSchema = z.object({
  url: z.string().url(),
  key: z.string(),
  tamanhoBytes: z.number(),
  mimeType: z.string(),
});

export type UploadResult = z.infer<typeof UploadResultSchema>;

// ─── Filtros e Parâmetros ─────────────────────────────────────────────────────

export const PaginationParamsSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

export const CursoFiltersSchema = PaginationParamsSchema.extend({
  search: z.string().optional(),
  categoria: z.string().optional(),
  autorId: z.string().optional(),
});

export type CursoFilters = z.infer<typeof CursoFiltersSchema>;

export const SimulacaoFiltersSchema = PaginationParamsSchema.extend({
  search: z.string().optional(),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export type SimulacaoFilters = z.infer<typeof SimulacaoFiltersSchema>;

// ─── Paginação ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  pageCount: z.number().int().min(0),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export function paginated<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationSchema,
  });
}

// ─── Resposta de erro ────────────────────────────────────────────────────────

export const ApiErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

// ─── Vocacional ───────────────────────────────────────────────────────────────

export const PerfilVocacionalSchema = z.object({
  alunoId: z.string(),
  aptidao: z.number().min(0).max(10),
  consistencia: z.number().min(0).max(10),
  dedicacao: z.number().min(0).max(10),
  diversidade: z.number().min(0).max(10),
  scoreGlobal: z.number().min(0).max(10),
  updatedAt: z.string().datetime(),
});

export type PerfilVocacional = z.infer<typeof PerfilVocacionalSchema>;

export const RecomendacaoCursoSchema = z.object({
  cursoId: z.string(),
  titulo: z.string(),
  matchPercentagem: z.number().min(0).max(100),
  motivo: z.string(),
});

export type RecomendacaoCurso = z.infer<typeof RecomendacaoCursoSchema>;

export const RelatorioVocacionalSchema = z.object({
  perfil: PerfilVocacionalSchema,
  recomendacoes: z.array(RecomendacaoCursoSchema),
});

export type RelatorioVocacional = z.infer<typeof RelatorioVocacionalSchema>;

// ─── Projetos ─────────────────────────────────────────────────────────────────

export const ProjetoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  alunoId: z.string(),
  cursoId: z.string().optional(),
  tags: z.array(z.string()),
  imagemUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Projeto = z.infer<typeof ProjetoSchema>;

export const CreateProjetoPayloadSchema = z.object({
  titulo: z.string().min(3).max(120),
  descricao: z.string().min(10).max(2000),
  cursoId: z.string().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  imagemUrl: z.string().url().optional(),
  repoUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
});

export type CreateProjetoPayload = z.infer<typeof CreateProjetoPayloadSchema>;

// ─── Mentorias ────────────────────────────────────────────────────────────────

export const MentoriaEstadoSchema = z.enum([
  'pendente',
  'aceite',
  'recusada',
  'concluida',
]);

export type MentoriaEstado = z.infer<typeof MentoriaEstadoSchema>;

export const MentoriaSchema = z.object({
  id: z.string(),
  alunoId: z.string(),
  mentorId: z.string(),
  mensagem: z.string(),
  estado: MentoriaEstadoSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Mentoria = z.infer<typeof MentoriaSchema>;

export const SolicitarMentoriaPayloadSchema = z.object({
  mentorId: z.string().min(1),
  mensagem: z.string().min(10).max(500),
});

export type SolicitarMentoriaPayload = z.infer<typeof SolicitarMentoriaPayloadSchema>;

// ─── Vínculo a Instituição ────────────────────────────────────────────────────

export const VinculoInstituicaoSchema = z.object({
  id: z.string(),
  userId: z.string(),
  instituicaoId: z.string(),
  cargo: z.string().optional(),
  verificado: z.boolean(),
  createdAt: z.string().datetime(),
});

export type VinculoInstituicao = z.infer<typeof VinculoInstituicaoSchema>;

// ─── Conquistas ───────────────────────────────────────────────────────────────

export const ConquistaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  icone: z.string(),
  desbloqueada: z.boolean(),
  dataDesbloqueio: z.string().datetime().optional(),
});

export type Conquista = z.infer<typeof ConquistaSchema>;

// ─── Denúncias ────────────────────────────────────────────────────────────────

export const DenunciaEstadoSchema = z.enum(['pendente', 'em_analise', 'resolvida']);
export type DenunciaEstado = z.infer<typeof DenunciaEstadoSchema>;

export const DenunciaAccaoSchema = z.enum(['remover', 'avisar', 'ignorar']);
export type DenunciaAccao = z.infer<typeof DenunciaAccaoSchema>;

export const DenunciaSchema = z.object({
  id: z.string(),
  conteudoId: z.string(),
  conteudoTipo: z.string(),
  motivo: z.string(),
  estado: DenunciaEstadoSchema,
  accao: DenunciaAccaoSchema.optional(),
  nota: z.string().optional(),
  denuncianteId: z.string(),
  criadaEm: z.string().datetime(),
});

export type Denuncia = z.infer<typeof DenunciaSchema>;

export const CriarDenunciaPayloadSchema = z.object({
  conteudoId: z.string().min(1),
  conteudoTipo: z.string().min(1),
  motivo: z.string().min(10).max(1000),
});

export type CriarDenunciaPayload = z.infer<typeof CriarDenunciaPayloadSchema>;

export const ResolverDenunciaPayloadSchema = z.object({
  accao: DenunciaAccaoSchema,
  nota: z.string().min(5).max(500),
});

export type ResolverDenunciaPayload = z.infer<typeof ResolverDenunciaPayloadSchema>;

export const DenunciaListParamsSchema = PaginationParamsSchema.extend({
  estado: DenunciaEstadoSchema.optional(),
  tipo: z.string().optional(),
});

export type DenunciaListParams = z.infer<typeof DenunciaListParamsSchema>;

// ─── Auditoria ────────────────────────────────────────────────────────────────

export const AuditLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  accao: z.string(),
  recurso: z.string().optional(),
  recursoId: z.string().optional(),
  ip: z.string(),
  timestamp: z.string().datetime(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogParamsSchema = PaginationParamsSchema.extend({
  userId: z.string().optional(),
  accao: z.string().optional(),
});

export type AuditLogParams = z.infer<typeof AuditLogParamsSchema>;

export const AdminUtilizadoresParamsSchema = PaginationParamsSchema.extend({
  role: RoleSchema.optional(),
  search: z.string().optional(),
});

export type AdminUtilizadoresParams = z.infer<typeof AdminUtilizadoresParamsSchema>;

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export const AdminStatsSchema = z.object({
  totalUtilizadores: z.number().int(),
  totalSimulacoes: z.number().int(),
  totalCursos: z.number().int(),
  denunciasPendentes: z.number().int(),
});

export type AdminStats = z.infer<typeof AdminStatsSchema>;

// ─── LTI 1.3 ──────────────────────────────────────────────────────────────────

export const LtiPlataformaSchema = z.object({
  id: z.string(),
  nome: z.string(),
  issuer: z.string().url(),
  clientId: z.string(),
  authLoginUrl: z.string().url(),
  authTokenUrl: z.string().url(),
  keySetUrl: z.string().url(),
  ativo: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LtiPlataforma = z.infer<typeof LtiPlataformaSchema>;

export const CreateLtiPlataformaPayloadSchema = LtiPlataformaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateLtiPlataformaPayload = z.infer<typeof CreateLtiPlataformaPayloadSchema>;

export const LtiLaunchClaimsSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  iat: z.number(),
  nonce: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': z.string(),
  'https://purl.imsglobal.org/spec/lti/claim/message_type': z.literal('LtiResourceLinkRequest'),
  'https://purl.imsglobal.org/spec/lti/claim/version': z.literal('1.3.0'),
  'https://purl.imsglobal.org/spec/lti/claim/resource_link': z.object({
    id: z.string(),
    title: z.string().optional(),
  }),
  'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': z.object({
    scope: z.array(z.string()),
    lineitems: z.string().url().optional(),
    lineitem: z.string().url().optional(),
  }).optional(),
  'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': z.object({
    context_memberships_url: z.string().url(),
    service_versions: z.array(z.string()),
  }).optional(),
});

export type LtiLaunchClaims = z.infer<typeof LtiLaunchClaimsSchema>;

export const LtiScoreSchema = z.object({
  userId: z.string(),
  scoreGiven: z.number(),
  scoreMaximum: z.number(),
  comment: z.string().optional(),
  timestamp: z.string().datetime(),
  activityProgress: z.enum(['Initialized', 'Started', 'InProgress', 'Submitted', 'Completed']),
  gradingProgress: z.enum(['FullyGraded', 'Pending', 'PendingManual', 'Failed', 'NotReady']),
});

export type LtiScore = z.infer<typeof LtiScoreSchema>;

// ─── AI / Chat ────────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatPayloadSchema = z.object({
  message: z.string().min(1),
  cursoId: z.string().optional(),
  moduloId: z.string().optional(),
  stream: z.boolean().optional(),
});

export type ChatPayload = z.infer<typeof ChatPayloadSchema>;

export const QuizPerguntaSchema = z.object({
  id: z.string(),
  pergunta: z.string(),
  opcoes: z.array(z.string()).length(4),
  respostaCorreta: z.number().int().min(0).max(3),
  explicacao: z.string(),
});

export type QuizPergunta = z.infer<typeof QuizPerguntaSchema>;

// ─── Realtime / Notificações ──────────────────────────────────────────────────

export const NotificacaoRealtimeSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  corpo: z.string(),
  tipo: z.enum(['info', 'sucesso', 'aviso', 'erro']),
  timestamp: z.string().datetime(),
});

export type NotificacaoRealtime = z.infer<typeof NotificacaoRealtimeSchema>;

// ─── Catálogo Público ─────────────────────────────────────────────────────────

export const CursoPublicoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: z.string().optional(),
  nivel: z.string().optional(),
  idioma: z.string().optional(),
  gratuito: z.boolean().optional(),
  totalHoras: z.number(),
  autorNome: z.string().optional(),
});

export type CursoPublico = z.infer<typeof CursoPublicoSchema>;

export const SimulacaoPublicaSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: z.string().optional(),
  tipo: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  nivel: z.string().optional(),
});

export type SimulacaoPublica = z.infer<typeof SimulacaoPublicaSchema>;

export const ExperienciaPublicaSchema = z.object({
  id: z.string(),
  slug: z.string(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: z.string().optional(),
  nivel: z.string().optional(),
  instituicaoNome: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
});

export type ExperienciaPublica = z.infer<typeof ExperienciaPublicaSchema>;

export const MentorPublicoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  areaEspecialidade: z.string().optional(),
  disponivel: z.boolean().optional(),
});

export type MentorPublico = z.infer<typeof MentorPublicoSchema>;

export const InstituicaoPublicaSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  nome: z.string(),
  descricao: z.string().optional(),
  logoUrl: z.string().url().optional(),
  tipo: z.string().optional(),
  regiao: z.string().optional(),
});

export type InstituicaoPublica = z.infer<typeof InstituicaoPublicaSchema>;

export const PerfilPublicoBasicoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
  role: RoleSchema,
});

export type PerfilPublicoBasico = z.infer<typeof PerfilPublicoBasicoSchema>;

export const ExplorarResultadoSchema = z.object({
  tipo: z.enum(['curso', 'simulacao', 'experiencia', 'mentor', 'instituicao']),
  id: z.string(),
  slug: z.string().optional(),
  titulo: z.string(),
  descricao: z.string().optional(),
  capaUrl: z.string().url().optional(),
  area: z.string().optional(),
});

export type ExplorarResultado = z.infer<typeof ExplorarResultadoSchema>;

// ─── Registo por Tipo ─────────────────────────────────────────────────────────

export const RegistoEstudantePayloadSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  areaInteresse: z.string().min(1).max(100),
  nivelEnsino: z.string().min(1).max(100),
});

export type RegistoEstudantePayload = z.infer<typeof RegistoEstudantePayloadSchema>;

export const RegistoMentorPayloadSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  areaEspecialidade: z.string().min(1).max(100),
  documentos: z.array(z.string().url()).optional(),
});

export type RegistoMentorPayload = z.infer<typeof RegistoMentorPayloadSchema>;

export const RegistoInstituicaoPayloadSchema = z.object({
  nomeInstituicao: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8),
  regiao: z.string().min(1).max(100),
  tipo: z.string().min(1).max(100),
  documentos: z.array(z.string().url()).optional(),
});

export type RegistoInstituicaoPayload = z.infer<typeof RegistoInstituicaoPayloadSchema>;

// ─── Catálogo: Meta de Paginação ──────────────────────────────────────────────

export const CatalogoMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  pageCount: z.number().int().min(0),
});

export type CatalogoMeta = z.infer<typeof CatalogoMetaSchema>;

// ─── Interações Transversais (Likes, Bookmarks, Ratings, Comments) ────────────

export const InteractionTargetTypeSchema = z.enum([
  'curso',
  'simulacao',
  'experiencia',
  'projeto',
  'mentor',
]);

export type InteractionTargetType = z.infer<typeof InteractionTargetTypeSchema>;

// Likes
export const LikeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  createdAt: z.string().datetime(),
});

export type Like = z.infer<typeof LikeSchema>;

export const LikeStatusSchema = z.object({
  liked: z.boolean(),
  count: z.number().int().min(0),
});

export type LikeStatus = z.infer<typeof LikeStatusSchema>;

export const ToggleLikePayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
});

export type ToggleLikePayload = z.infer<typeof ToggleLikePayloadSchema>;

// Bookmarks
export const BookmarkSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  createdAt: z.string().datetime(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;

export const BookmarkStatusSchema = z.object({
  bookmarked: z.boolean(),
});

export type BookmarkStatus = z.infer<typeof BookmarkStatusSchema>;

export const ToggleBookmarkPayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
});

export type ToggleBookmarkPayload = z.infer<typeof ToggleBookmarkPayloadSchema>;

// Ratings
export const RatingSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  valor: z.number().int().min(1).max(5),
  createdAt: z.string().datetime(),
});

export type Rating = z.infer<typeof RatingSchema>;

export const RatingStatsSchema = z.object({
  media: z.number().min(0).max(5),
  total: z.number().int().min(0),
  userRating: z.number().int().min(1).max(5).nullable(),
});

export type RatingStats = z.infer<typeof RatingStatsSchema>;

export const CreateRatingPayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  valor: z.number().int().min(1).max(5),
});

export type CreateRatingPayload = z.infer<typeof CreateRatingPayloadSchema>;

// Comments
export const CommentSchema = z.object({
  id: z.string(),
  userId: z.string(),
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  conteudo: z.string(),
  estado: z.enum(['pendente', 'aprovado', 'rejeitado']),
  createdAt: z.string(),
});

export type Comment = z.infer<typeof CommentSchema>;

export const CreateCommentPayloadSchema = z.object({
  targetType: InteractionTargetTypeSchema,
  targetId: z.string(),
  conteudo: z.string().min(1).max(2000),
});

export type CreateCommentPayload = z.infer<typeof CreateCommentPayloadSchema>;

// ─── Feed ─────────────────────────────────────────────────────────────────────

export const FeedItemTipoSchema = z.enum(['curso', 'simulacao', 'experiencia', 'projeto']);
export type FeedItemTipo = z.infer<typeof FeedItemTipoSchema>;

export const FeedItemStatsSchema = z.object({
  likes: z.number().int().min(0),
  ratingMedia: z.number().min(0).max(5),
  ratingTotal: z.number().int().min(0),
  completionRate: z.number().min(0).max(1).optional(),
});
export type FeedItemStats = z.infer<typeof FeedItemStatsSchema>;

export const FeedItemSchema = z.object({
  tipo: FeedItemTipoSchema,
  id: z.string(),
  slug: z.string().optional(),
  titulo: z.string(),
  descricao: z.string(),
  capaUrl: z.string().url().optional(),
  area: z.string().optional(),
  autorNome: z.string().optional(),
  autorId: z.string().optional(),
  score: z.number(),
  recencyScore: z.number(),
  stats: FeedItemStatsSchema,
  publicadoEm: z.string().datetime(),
});
export type FeedItem = z.infer<typeof FeedItemSchema>;

export const FeedWeightsSchema = z.object({
  engagement: z.number().min(0).max(1),
  completion: z.number().min(0).max(1),
  rating: z.number().min(0).max(1),
  recency: z.number().min(0).max(1),
  reputation: z.number().min(0).max(1),
  affinity: z.number().min(0).max(1),
  time: z.number().min(0).max(1),
});
export type FeedWeights = z.infer<typeof FeedWeightsSchema>;

export const FeedResponseSchema = z.object({
  data: z.array(FeedItemSchema),
  meta: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    hasMore: z.boolean(),
  }),
});
export type FeedResponse = z.infer<typeof FeedResponseSchema>;

export const UpdateFeedWeightsPayloadSchema = FeedWeightsSchema;
export type UpdateFeedWeightsPayload = z.infer<typeof UpdateFeedWeightsPayloadSchema>;

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export const AlunoStatsSchema = z.object({
  simulacoesConcluidas: z.number(),
  cursosEmProgresso: z.number(),
  conquistasTotal: z.number(),
});

export type AlunoStats = z.infer<typeof AlunoStatsSchema>;

export const MentorStatsSchema = z.object({
  mentoriasActivas: z.number(),
  alunosOrientados: z.number(),
  avaliacoesPendentes: z.number(),
});

export type MentorStats = z.infer<typeof MentorStatsSchema>;

export const InstituicaoStatsSchema = z.object({
  experienciasPublicadas: z.number(),
  inscricoesTotais: z.number(),
  programasActivos: z.number(),
  taxaPresenca: z.number().optional(),
  avaliacaoMedia: z.number().optional(),
  estudantesVinculados: z.number().optional(),
});

export type InstituicaoStats = z.infer<typeof InstituicaoStatsSchema>;

// ─── Vínculos (Connections) ───────────────────────────────────────────────

export const VinculoEstadoSchema = z.enum(['pending', 'connected', 'declined']);
export type VinculoEstado = z.infer<typeof VinculoEstadoSchema>;

export const VinculoTipoSchema = z.enum([
  'student-student',
  'student-mentor',
  'student-institution',
  'mentor-institution',
]);
export type VinculoTipo = z.infer<typeof VinculoTipoSchema>;

export const VinculoSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  receiverId: z.string(),
  estado: VinculoEstadoSchema,
  connectionType: VinculoTipoSchema,
  criadoEm: z.string().datetime(),
});

export type Vinculo = z.infer<typeof VinculoSchema>;

export const VinculoStatusSchema = z.object({
  estado: VinculoEstadoSchema.nullable(),
  vinculoId: z.string().nullable(),
  isSender: z.boolean(),
});

export type VinculoStatus = z.infer<typeof VinculoStatusSchema>;

export const VinculoComPerfilSchema = VinculoSchema.extend({
  senderPerfil: PerfilPublicoBasicoSchema,
  receiverPerfil: PerfilPublicoBasicoSchema,
});

export type VinculoComPerfil = z.infer<typeof VinculoComPerfilSchema>;

export const CriarVinculoPayloadSchema = z.object({
  receiverId: z.string().min(1),
  connectionType: VinculoTipoSchema,
});

export type CriarVinculoPayload = z.infer<typeof CriarVinculoPayloadSchema>;

export const AceitarRejeitarVinculoPayloadSchema = z.object({
  acao: z.enum(['aceitar', 'rejeitar']),
});

export type AceitarRejeitarVinculoPayload = z.infer<typeof AceitarRejeitarVinculoPayloadSchema>;

// ─── Mentorias ────────────────────────────────────────────────────────────────

export const MentoriaTipoSchema = z.enum([
  'orientacao_vocacional',
  'acompanhamento_curso',
  'revisao_projeto',
]);
export type MentoriaTipo = z.infer<typeof MentoriaTipoSchema>;

export const SolicitarMentoriaPayloadV2Schema = z.object({
  mentorId: z.string().min(1),
  mensagem: z.string().min(10).max(500),
  tipo: MentoriaTipoSchema,
  preco: z.number().min(0).default(0),
  cursoId: z.string().optional(),
  projetoId: z.string().optional(),
});
export type SolicitarMentoriaPayloadV2 = z.infer<typeof SolicitarMentoriaPayloadV2Schema>;

