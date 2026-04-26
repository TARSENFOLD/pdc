import type { Tentativa } from '@pdc/shared';

export interface PersonaFixture {
  estudanteId: string;
  nome: string;
  arquétipo: string;
  area: string;
  tentativas: Partial<Tentativa>[];
}

export const personas: PersonaFixture[] = [
  {
    estudanteId: 'estudante-cirurgiao',
    nome: 'O Cirurgião',
    arquétipo: 'O Cirurgião',
    area: 'Saúde',
    tentativas: [
      { id: 't1', simulacaoId: 'sim-saude-1', score: 9, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't2', simulacaoId: 'sim-saude-2', score: 10, dataFim: '2026-04-02T10:00:00Z' },
      { id: 't3', simulacaoId: 'sim-saude-3', score: 9, dataFim: '2026-04-03T10:00:00Z' },
      { id: 't4', simulacaoId: 'sim-saude-4', score: 10, dataFim: '2026-04-04T10:00:00Z' },
      { id: 't5', simulacaoId: 'sim-saude-5', score: 10, dataFim: '2026-04-05T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-hacker',
    nome: 'O Hacker Hesitante',
    arquétipo: 'O Hacker Hesitante',
    area: 'Tecnologia',
    tentativas: [
      { id: 'h1', simulacaoId: 'sim-tech-1', score: 10, dataFim: '2026-04-01T10:00:00Z' },
      { id: 'h2', simulacaoId: 'sim-tech-1', score: 7, dataFim: '2026-04-01T10:20:00Z' }, // Hesitação/Erro por dúvida
      { id: 'h3', simulacaoId: 'sim-tech-1', score: 10, dataFim: '2026-04-01T10:40:00Z' },
      { id: 'h4', simulacaoId: 'sim-tech-2', score: 9, dataFim: '2026-04-02T10:00:00Z' },
      { id: 'h5', simulacaoId: 'sim-tech-3', score: 10, dataFim: '2026-04-03T10:00:00Z' },
      { id: 'h6', simulacaoId: 'sim-tech-3', score: 8, dataFim: '2026-04-03T10:30:00Z' }, // Hesitação na conclusão
    ],
  },
  {
    estudanteId: 'estudante-gestor-impulsivo',
    nome: 'O Gestor Impulsivo',
    arquétipo: 'O Gestor Impulsivo',
    area: 'Gestão',
    tentativas: [
      { id: 't9', simulacaoId: 'sim-gest-1', score: 4, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't10', simulacaoId: 'sim-gest-2', score: 9, dataFim: '2026-04-02T10:00:00Z' },
      { id: 't11', simulacaoId: 'sim-gest-3', score: 5, dataFim: '2026-04-03T10:00:00Z' },
      { id: 't12', simulacaoId: 'sim-gest-1', score: 10, dataFim: '2026-04-04T10:00:00Z' },
      { id: 't13', simulacaoId: 'sim-gest-2', score: 6, dataFim: '2026-04-05T10:00:00Z' },
      { id: 't14', simulacaoId: 'sim-gest-3', score: 8, dataFim: '2026-04-06T10:00:00Z' },
      { id: 't15', simulacaoId: 'sim-gest-4', score: 7, dataFim: '2026-04-07T10:00:00Z' },
      { id: 't16', simulacaoId: 'sim-gest-4', score: 9, dataFim: '2026-04-08T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-engenheiro-focado',
    nome: 'Engenheiro Focado',
    arquétipo: 'Estável',
    area: 'Engenharia',
    tentativas: [
      { id: 't17', simulacaoId: 'sim-eng-1', score: 8, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't18', simulacaoId: 'sim-eng-2', score: 8, dataFim: '2026-04-02T10:00:00Z' },
      { id: 't19', simulacaoId: 'sim-eng-3', score: 9, dataFim: '2026-04-03T10:00:00Z' },
      { id: 't20', simulacaoId: 'sim-eng-4', score: 8, dataFim: '2026-04-04T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-artista-explorador',
    nome: 'O Artista Explorador',
    arquétipo: 'Explorador',
    area: 'Artes',
    tentativas: [
      { id: 't21', simulacaoId: 'sim-art-1', score: 7, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't22', simulacaoId: 'sim-art-2', score: 6, dataFim: '2026-04-02T10:00:00Z' },
      { id: 't23', simulacaoId: 'sim-art-3', score: 8, dataFim: '2026-04-03T10:00:00Z' },
      { id: 't24', simulacaoId: 'sim-art-4', score: 7, dataFim: '2026-04-04T10:00:00Z' },
      { id: 't25', simulacaoId: 'sim-art-5', score: 9, dataFim: '2026-04-05T10:00:00Z' },
      { id: 't26', simulacaoId: 'sim-art-6', score: 7, dataFim: '2026-04-06T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-cientista-social',
    nome: 'O Cientista Social',
    arquétipo: 'Persistente',
    area: 'Ciências Sociais',
    tentativas: [
      { id: 't27', simulacaoId: 'sim-cs-1', score: 7, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't28', simulacaoId: 'sim-cs-1', score: 7, dataFim: '2026-04-02T10:00:00Z' },
      { id: 't29', simulacaoId: 'sim-cs-1', score: 7, dataFim: '2026-04-03T10:00:00Z' },
      { id: 't30', simulacaoId: 'sim-cs-1', score: 7, dataFim: '2026-04-04T10:00:00Z' },
      { id: 't31', simulacaoId: 'sim-cs-1', score: 7, dataFim: '2026-04-05T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-transicao',
    nome: 'Estudante em Transição',
    arquétipo: 'Pivô Vocacional',
    area: 'Saúde -> Tecnologia',
    tentativas: [
      { id: 't32', simulacaoId: 'sim-saude-1', score: 4, dataFim: '2026-03-01T10:00:00Z' },
      { id: 't33', simulacaoId: 'sim-saude-2', score: 4, dataFim: '2026-03-02T10:00:00Z' },
      { id: 't34', simulacaoId: 'sim-tech-1', score: 9, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't35', simulacaoId: 'sim-tech-2', score: 9, dataFim: '2026-04-02T10:00:00Z' },
      { id: 't36', simulacaoId: 'sim-tech-3', score: 9, dataFim: '2026-04-03T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-procrastinador',
    nome: 'O Procrastinador',
    arquétipo: 'Baixo Volume',
    area: 'Tecnologia',
    tentativas: [
      { id: 't37', simulacaoId: 'sim-tech-1', score: 5, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't38', simulacaoId: 'sim-tech-1', score: 6, dataFim: '2026-04-10T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-mestre-gestao',
    nome: 'O Mestre da Gestão',
    arquétipo: 'Elite',
    area: 'Gestão',
    tentativas: [
      { id: 't39', simulacaoId: 'sim-gest-1', score: 10, dataFim: '2026-04-01T10:00:00Z' },
      { id: 't40', simulacaoId: 'sim-gest-2', score: 10, dataFim: '2026-04-02T10:00:00Z' },
      { id: 't41', simulacaoId: 'sim-gest-3', score: 10, dataFim: '2026-04-03T10:00:00Z' },
      { id: 't42', simulacaoId: 'sim-gest-4', score: 10, dataFim: '2026-04-04T10:00:00Z' },
      { id: 't43', simulacaoId: 'sim-gest-5', score: 10, dataFim: '2026-04-05T10:00:00Z' },
      { id: 't44', simulacaoId: 'sim-gest-6', score: 10, dataFim: '2026-04-06T10:00:00Z' },
      { id: 't45', simulacaoId: 'sim-gest-7', score: 10, dataFim: '2026-04-07T10:00:00Z' },
      { id: 't46', simulacaoId: 'sim-gest-8', score: 10, dataFim: '2026-04-08T10:00:00Z' },
      { id: 't47', simulacaoId: 'sim-gest-9', score: 10, dataFim: '2026-04-09T10:00:00Z' },
      { id: 't48', simulacaoId: 'sim-gest-10', score: 10, dataFim: '2026-04-10T10:00:00Z' },
    ],
  },
  {
    estudanteId: 'estudante-erratico',
    nome: 'O Estudante Errático',
    arquétipo: 'Dados Incompletos',
    area: 'Desconhecida',
    tentativas: [
      { id: 't50', simulacaoId: 'sim-unknown', score: 10, dataFim: '2026-04-15T10:00:00Z' },
      { id: 't51', simulacaoId: 'sim-unknown', score: undefined, dataFim: '2026-04-16T10:00:00Z' },
    ],
  },
];
