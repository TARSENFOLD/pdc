// ─── Types ───────────────────────────────────────────────────────────────────

export interface PulseEntry {
  id: string;
  text: string;
}

// ─── Nomes angolanos ─────────────────────────────────────────────────────────

const NOMES = [
  'Tomas', 'Nelson', 'Marta', 'Nuno', 'Elisa', 'Joana', 'Pedro', 'Ana',
  'Ricardo', 'Sofia', 'Carlos', 'Ines', 'Miguel', 'Catarina', 'Diogo',
  'Helena', 'Rui', 'Teresa', 'Andre', 'Beatriz', 'Filipe', 'Mariana',
] as const;

// ─── Seed default (exibição estática inicial) ────────────────────────────────

export const SEED_DEFAULT: readonly string[] = [
  'Elisa completou Diagnostico Clinico e entrou no Squad Saude.',
  'Nelson finalizou Mini-Bridge e recebeu convite para mentoraria.',
  'Sara subiu 12% em afinidade com Telecom apos simulacao de redes.',
  'Tomas validou rota em Energia e recebeu recomendacao de curso tecnico.',
  'Marta concluiu desafio de Gestao e abriu trilha para estagio local.',
  'Nuno ajustou objetivo para Ciencia de Dados apos feedback IA.',
];

// ─── Pool por área vocacional ────────────────────────────────────────────────

const POOL_BY_AREA: Record<string, readonly string[]> = {
  saude: [
    '{nome} completou Diagnostico Clinico e entrou no Squad Saude.',
    '{nome} concluiu simulacao de farmacologia e entrou no ranking.',
    '{nome} finalizou caso de urgencia e recebeu certificado.',
    '{nome} completou triagem hospitalar e recebeu badge de Emergencia.',
  ],
  engenharia: [
    '{nome} finalizou Mini-Bridge e recebeu convite para mentoraria.',
    '{nome} completou desafio de circuitos e recebeu recomendacao de estagio.',
    '{nome} concluiu prototipo estrutural e desbloqueou modulo avancado.',
    '{nome} terminou calculo de carga e recebeu badge de Estruturas.',
  ],
  tecnologia: [
    '{nome} validou rota em Energia e recebeu recomendacao de curso tecnico.',
    '{nome} ajustou objetivo para Ciencia de Dados apos feedback IA.',
    '{nome} completou prototipo de app e recebeu feedback da comunidade.',
    '{nome} terminou modulo de ciberseguranca e obteve badge.',
    '{nome} subiu 12% em afinidade com Telecom apos simulacao de redes.',
  ],
  direito: [
    '{nome} terminou simulacao de tribunal e recebeu badge de Argumentacao.',
    '{nome} finalizou caso pratico de direito civil e obteve pontos.',
    '{nome} concluiu mediacao de conflito e entrou no ranking.',
  ],
  gestao: [
    '{nome} concluiu desafio de Gestao e abriu trilha para estagio local.',
    '{nome} concluiu estrategia de mercado e recebeu recomendacao para Gestao.',
    '{nome} finalizou analise financeira e desbloqueou modulo avancado.',
    '{nome} completou plano de negocios e recebeu feedback de mentor.',
  ],
  educacao: [
    '{nome} completou plano de aula e entrou no grupo de Pedagogia.',
    '{nome} finalizou dinamica de turma e recebeu badge de Facilitacao.',
    '{nome} concluiu modulo de didactica e obteve certificado.',
  ],
  artes: [
    '{nome} submeteu portfolio criativo e recebeu feedback de mentor.',
    '{nome} finalizou projecto audiovisual e entrou no ranking.',
    '{nome} completou composicao musical e desbloqueou modulo avancado.',
  ],
  exploratorio: [
    '{nome} validou perfil vocacional e recebeu 3 sugestoes de curso.',
    '{nome} aceitou mentoria e iniciou trilha personalizada.',
    '{nome} completou auto-avaliacao e recebeu orientacao de carreira.',
    '{nome} explorou nova area e recebeu recomendacoes personalizadas.',
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const PULSE_LIMIT = 6;

function pickRandom<T>(arr: readonly T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) {
    throw new Error('PickRandom: Array vazio');
  }
  return item;
}

function hydrateName(template: string): string {
  return template.replace('{nome}', pickRandom(NOMES));
}

/** Junta entries da área (lowercase) + genéricas (exploratorio), sem duplicatas */
export function getPool(area = 'exploratorio'): string[] {
  const key = area.toLowerCase();
  const areaEntries = POOL_BY_AREA[key] ?? [];
  const generic = POOL_BY_AREA.exploratorio ?? [];
  return [...new Set([...areaEntries, ...generic])];
}

/** Adiciona entry no topo, dedup por texto, cap em PULSE_LIMIT */
export function upsertPulse(list: PulseEntry[], text: string): PulseEntry[] {
  const trimmed = text.trim();
  if (!trimmed) return list;
  return [
    { id: crypto.randomUUID(), text: trimmed },
    ...list.filter((e) => e.text !== trimmed),
  ].slice(0, PULSE_LIMIT);
}

/** Gera uma frase aleatória do pool, com nome hydratado */
export function randomPulseFromPool(area?: string): string {
  const pool = getPool(area);
  return hydrateName(pickRandom(pool));
}

/** Constrói as 6 entries iniciais a partir do SEED_DEFAULT */
export function buildInitialEntries(): PulseEntry[] {
  return SEED_DEFAULT.map((text): PulseEntry => ({
    id: crypto.randomUUID(),
    text,
  }));
}
