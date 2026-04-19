import { type AreaVocacional } from '@pdc/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Area = AreaVocacional;

export interface Opcao { emoji: string; texto: string }
export interface PerguntaData { texto: string; opcoes: Opcao[] }

export interface Veredito {
  area: string;
  score: number;
  arquetipo: string;
  proximoPasso: string;
  simulacoes: string[];
}

export type Fase = 'intro' | 'texto_livre' | 'pergunta' | 'carregando' | 'veredito' | 'erro' | 'limite';

export interface MicroDesafioState {
  fase: Fase;
  textoLivre: string;
  perguntaActual: number;
  respostas: number[];
  veredito: Veredito | null;
  pulso: { count: number; area?: string };
}

// ─── Area metadata ────────────────────────────────────────────────────────────

export const AREA_EMOJI: Record<Area, string> = {
  SAUDE: '🏥',
  ENGENHARIA: '⚙️',
  TECNOLOGIA: '💻',
  DIREITO: '⚖️',
  GESTAO: '📊',
  EDUCACAO: '📚',
  ARTES: '🎨',
  CIENCIAS_AGRARIAS: '🌱',
  CIENCIAS_SOCIAIS: '🤝',
  COMUNICACAO: '📢',
  CIENCIAS_NATURAIS: '🧪',
  ARQUITETURA: '🏛️',
  TURISMO_HOTELARIA: '🏨',
  DESPORTO: '🏃',
  OUTRA: '🌍',
};

export const AREA_LABEL: Record<Area, string> = {
  SAUDE: 'Saúde',
  ENGENHARIA: 'Engenharia',
  TECNOLOGIA: 'Tecnologia',
  DIREITO: 'Direito',
  GESTAO: 'Gestão',
  EDUCACAO: 'Educação',
  ARTES: 'Artes',
  CIENCIAS_AGRARIAS: 'Ciências Agrárias',
  CIENCIAS_SOCIAIS: 'Ciências Sociais',
  COMUNICACAO: 'Comunicação',
  CIENCIAS_NATURAIS: 'Ciências Naturais',
  ARQUITETURA: 'Arquitetura',
  TURISMO_HOTELARIA: 'Turismo e Hotelaria',
  DESPORTO: 'Desporto',
  OUTRA: 'Geral',
};

// ─── Keyword detection ────────────────────────────────────────────────────────

const KW: Record<Exclude<Area, 'OUTRA'>, string[]> = {
  SAUDE: ['medicina', 'saúde', 'enfermagem', 'farmácia', 'hospital', 'médico', 'biologia', 'clínica', 'diagnóstico', 'paciente'],
  ENGENHARIA: ['engenharia', 'construção', 'estrutura', 'obra', 'civil', 'mecânica', 'eléctrica', 'cálculo', 'infraestrutura'],
  TECNOLOGIA: ['tecnologia', 'programação', 'software', 'computador', 'informática', 'dados', 'código', 'desenvolvimento', 'app', 'algoritmo'],
  DIREITO: ['direito', 'lei', 'justiça', 'advogado', 'tribunal', 'jurídico', 'constitucional', 'defesa', 'acusação', 'normas'],
  GESTAO: ['gestão', 'negócio', 'empresa', 'administração', 'finanças', 'marketing', 'economia', 'liderança', 'estratégia', 'crise'],
  EDUCACAO: ['educação', 'ensino', 'professor', 'escola', 'pedagogia', 'aprender', 'formação', 'didática', 'aula', 'aluno'],
  ARTES: ['arte', 'música', 'teatro', 'design', 'cinema', 'pintura', 'fotografia', 'criativo', 'exposição', 'cultura'],
  CIENCIAS_AGRARIAS: ['agronomia', 'agricultura', 'campo', 'rural', 'colheita', 'pecuária', 'veterinária', 'plantio', 'terra', 'agronegócio'],
  CIENCIAS_SOCIAIS: ['psicologia', 'sociologia', 'comunidade', 'social', 'humano', 'comportamento', 'sociedade', 'política', 'história', 'antropologia'],
  COMUNICACAO: ['jornalismo', 'media', 'comunicação', 'notícia', 'redação', 'público', 'rádio', 'televisão', 'digital', 'influência'],
  CIENCIAS_NATURAIS: ['química', 'física', 'biologia', 'laboratório', 'ciência', 'investigação', 'átomo', 'molécula', 'espécie', 'ecossistema'],
  ARQUITETURA: ['arquitetura', 'urbanismo', 'desenho', 'espaço', 'edifício', 'planta', 'cidade', 'habitação', 'estética', 'projeto'],
  TURISMO_HOTELARIA: ['turismo', 'hotel', 'hospitalidade', 'viagem', 'restauração', 'guia', 'serviço', 'resort', 'evento', 'recepção'],
  DESPORTO: ['desporto', 'desportivo', 'treino', 'atleta', 'performance', 'fisiologia', 'exercício', 'equipa', 'competição', 'saúde física'],
};

export function detectarArea(texto: string): Area {
  const lower = texto.toLowerCase();
  let best: Area = 'OUTRA';
  let max = 0;
  for (const [area, words] of Object.entries(KW)) {
    const n = words.filter((w) => lower.includes(w)).length;
    if (n > max) { max = n; best = area as Area; }
  }
  return best;
}

// ─── Questions are now generated via API ──────────────────────────────────────
// FALLBACK: In case API is down, use a generic set.
export const PERGUNTAS_FALLBACK: PerguntaData[] = [
  { texto: 'O que te imaginas a fazer em 5 anos?', opcoes: [{ emoji: '💼', texto: 'Trabalhar na minha área' }, { emoji: '🏢', texto: 'Ter negócio próprio' }, { emoji: '🎓', texto: 'Continuar a estudar' }, { emoji: '🌍', texto: 'Ajudar a comunidade' }] },
  { texto: 'Qual é a tua maior motivação?', opcoes: [{ emoji: '🏆', texto: 'Sucesso profissional' }, { emoji: '❤️', texto: 'Impacto social' }, { emoji: '🧘', texto: 'Realização pessoal' }, { emoji: '💰', texto: 'Segurança financeira' }] },
  { texto: 'Como preferes aprender?', opcoes: [{ emoji: '🛠️', texto: 'Na prática' }, { emoji: '📖', texto: 'A ler' }, { emoji: '🧑‍🏫', texto: 'Em aulas' }, { emoji: '💬', texto: 'Em grupo' }] },
  { texto: 'O que valorizas numa profissão?', opcoes: [{ emoji: '🎨', texto: 'Criatividade' }, { emoji: '🏢', texto: 'Estabilidade' }, { emoji: '🦅', texto: 'Autonomia' }, { emoji: '👥', texto: 'Trabalho em equipa' }] },
  { texto: 'Que impacto queres ter?', opcoes: [{ emoji: '🏥', texto: 'Na saúde' }, { emoji: '📈', texto: 'Na economia' }, { emoji: '📚', texto: 'Na educação' }, { emoji: '🎭', texto: 'Na cultura' }] },
];
