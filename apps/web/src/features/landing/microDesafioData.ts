// ─── Types ────────────────────────────────────────────────────────────────────

export type Area = 'SAUDE' | 'ENGENHARIA' | 'TECNOLOGIA' | 'DIREITO' | 'GESTAO' | 'EDUCACAO' | 'ARTES' | 'GERAL';

export interface Opcao { emoji: string; texto: string }
export interface PerguntaData { texto: string; opcoes: Opcao[] }

export interface Veredito {
  area: string;
  score: number;
  arquetipo: string;
  proximoPasso: string;
  simulacoes: string[];
}

export type Fase = 'intro' | 'texto_livre' | 'pergunta' | 'carregando' | 'veredito';

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
  SAUDE: '🏥', ENGENHARIA: '⚙️', TECNOLOGIA: '💻', DIREITO: '⚖️',
  GESTAO: '📊', EDUCACAO: '📚', ARTES: '🎨', GERAL: '🌍',
};

export const AREA_LABEL: Record<Area, string> = {
  SAUDE: 'Saúde', ENGENHARIA: 'Engenharia', TECNOLOGIA: 'Tecnologia', DIREITO: 'Direito',
  GESTAO: 'Gestão', EDUCACAO: 'Educação', ARTES: 'Artes', GERAL: 'Geral',
};

// ─── Keyword detection ────────────────────────────────────────────────────────

const KW: Record<Exclude<Area, 'GERAL'>, string[]> = {
  SAUDE: ['medicina', 'saúde', 'enfermagem', 'farmácia', 'hospital', 'médico', 'biologia', 'clínica'],
  ENGENHARIA: ['engenharia', 'construção', 'estrutura', 'obra', 'civil', 'mecânica', 'eléctrica'],
  TECNOLOGIA: ['tecnologia', 'programação', 'software', 'computador', 'informática', 'dados', 'código'],
  DIREITO: ['direito', 'lei', 'justiça', 'advogado', 'tribunal', 'jurídico', 'constitucional'],
  GESTAO: ['gestão', 'negócio', 'empresa', 'administração', 'finanças', 'marketing', 'economia'],
  EDUCACAO: ['educação', 'ensino', 'professor', 'escola', 'pedagogia', 'aprender', 'formação'],
  ARTES: ['arte', 'música', 'teatro', 'design', 'cinema', 'pintura', 'fotografia', 'criativo'],
};

export function detectarArea(texto: string): Area {
  const lower = texto.toLowerCase();
  let best: Area = 'GERAL';
  let max = 0;
  for (const [area, words] of Object.entries(KW)) {
    const n = words.filter((w) => lower.includes(w)).length;
    if (n > max) { max = n; best = area as Area; }
  }
  return best;
}

// ─── Questions per area ───────────────────────────────────────────────────────

const o = (emoji: string, texto: string): Opcao => ({ emoji, texto });

export const PERGUNTAS: Record<Area, PerguntaData[]> = {
  SAUDE: [
    { texto: 'Como reages ao ver alguém ferido?', opcoes: [o('🏥', 'Ajudo de imediato'), o('📋', 'Avalio a situação'), o('📞', 'Chamo ajuda'), o('🧘', 'Conforto a pessoa')] },
    { texto: 'O que te interessa mais em biologia?', opcoes: [o('🫀', 'Corpo humano'), o('🦠', 'Doenças e curas'), o('💊', 'Medicamentos'), o('🧬', 'Genética')] },
    { texto: 'Onde te imaginas num hospital?', opcoes: [o('🚑', 'Urgências'), o('🔬', 'Laboratório'), o('🩺', 'Consultório'), o('💉', 'Farmácia')] },
    { texto: 'Que desafio na saúde te motiva?', opcoes: [o('❤️', 'Curar doenças'), o('🛡️', 'Prevenir epidemias'), o('🔍', 'Investigar causas'), o('🧠', 'Apoio mental')] },
    { texto: 'Como preferes ajudar pacientes?', opcoes: [o('👐', 'Tratar directamente'), o('📊', 'Analisar exames'), o('📝', 'Planear cuidados'), o('👂', 'Ouvir e aconselhar')] },
  ],
  ENGENHARIA: [
    { texto: 'Quando algo avaria, o que fazes?', opcoes: [o('🔧', 'Desmonto e reparo'), o('🔍', 'Investigo a causa'), o('📐', 'Desenho solução'), o('💡', 'Improviso algo')] },
    { texto: 'O que te fascina numa cidade?', opcoes: [o('🏗️', 'Edifícios altos'), o('🌉', 'Pontes e estradas'), o('⚡', 'Redes eléctricas'), o('🚰', 'Sistemas de água')] },
    { texto: 'Que projecto preferes?', opcoes: [o('🏢', 'Construir algo grande'), o('⚙️', 'Optimizar processos'), o('📦', 'Gerir materiais'), o('📝', 'Desenhar plantas')] },
    { texto: 'Como resolves um problema técnico?', opcoes: [o('🧮', 'Calculo e modelo'), o('🧪', 'Testo protótipos'), o('📚', 'Consulto referências'), o('🛠️', 'Experimento soluções')] },
    { texto: 'O que te dá mais satisfação?', opcoes: [o('🏛️', 'Ver algo construído'), o('🔩', 'Resolver falhas'), o('📈', 'Melhorar eficiência'), o('🚀', 'Inovar processos')] },
  ],
  TECNOLOGIA: [
    { texto: 'Se criasses uma app, para que seria?', opcoes: [o('📚', 'Educação'), o('🏥', 'Saúde'), o('🎮', 'Entretenimento'), o('💰', 'Finanças')] },
    { texto: 'O que te atrai na informática?', opcoes: [o('💻', 'Programar'), o('📊', 'Analisar dados'), o('🎨', 'Criar interfaces'), o('🔒', 'Segurança digital')] },
    { texto: 'Como aprendes tecnologia?', opcoes: [o('⌨️', 'Codifico logo'), o('📖', 'Leio documentação'), o('🎥', 'Vejo tutoriais'), o('🧪', 'Experimento ferramentas')] },
    { texto: 'Que área te interessa mais?', opcoes: [o('🤖', 'Inteligência artificial'), o('🛡️', 'Cibersegurança'), o('🌐', 'Desenvolvimento web'), o('📈', 'Ciência de dados')] },
    { texto: 'Quando um programa falha?', opcoes: [o('🐛', 'Debug passo a passo'), o('📋', 'Leio o erro'), o('🔎', 'Pesquiso online'), o('♻️', 'Reescrevo do zero')] },
  ],
  DIREITO: [
    { texto: 'Numa discussão, qual é o teu papel?', opcoes: [o('⚔️', 'Argumento com lógica'), o('🤝', 'Medio o conflito'), o('🛡️', 'Defendo o mais fraco'), o('👀', 'Observo e analiso')] },
    { texto: 'Perante uma injustiça, o que fazes?', opcoes: [o('✊', 'Quero agir já'), o('📜', 'Analiso as leis'), o('📸', 'Documento tudo'), o('📢', 'Mobilizo pessoas')] },
    { texto: 'Que tipo de caso te interessa?', opcoes: [o('🔍', 'Criminal'), o('🏢', 'Empresarial'), o('✋', 'Direitos humanos'), o('👨‍👩‍👧', 'Família')] },
    { texto: 'Como resolves um conflito?', opcoes: [o('👂', 'Ouço os dois lados'), o('📏', 'Aplico regras justas'), o('🤲', 'Proponho acordo'), o('💬', 'Aconselho em separado')] },
    { texto: 'O que valorizas no direito?', opcoes: [o('⚖️', 'Justiça social'), o('📋', 'Ordem e regras'), o('🛡️', 'Protecção de direitos'), o('🕊️', 'Resolução pacífica')] },
  ],
  GESTAO: [
    { texto: 'Num grupo, o que preferes?', opcoes: [o('👑', 'Liderar a equipa'), o('💰', 'Gerir o orçamento'), o('🎯', 'Definir estratégia'), o('📋', 'Organizar tarefas')] },
    { texto: 'Que empresa criarias?', opcoes: [o('💻', 'Tecnologia'), o('🛒', 'Comércio'), o('🤝', 'Serviços'), o('🏭', 'Indústria')] },
    { texto: 'O que te atrai nos negócios?', opcoes: [o('📈', 'Crescer receitas'), o('👥', 'Gerir pessoas'), o('🗺️', 'Planear estratégia'), o('🤝', 'Negociar contratos')] },
    { texto: 'Como organizas projectos?', opcoes: [o('📅', 'Faço cronograma'), o('🎯', 'Defino prioridades'), o('👥', 'Delego tarefas'), o('📊', 'Monitoro resultados')] },
    { texto: 'Que competência valorizas mais?', opcoes: [o('👑', 'Liderança'), o('📊', 'Análise financeira'), o('📢', 'Comunicação'), o('💡', 'Inovação')] },
  ],
  EDUCACAO: [
    { texto: 'Já ajudaste alguém a aprender?', opcoes: [o('🧑‍🏫', 'Expliquei com paciência'), o('🔧', 'Usei exemplos práticos'), o('📝', 'Criei exercícios'), o('🔥', 'Motivei com entusiasmo')] },
    { texto: 'O que te motiva no ensino?', opcoes: [o('💡', 'Ver alguém perceber'), o('📖', 'Partilhar conhecimento'), o('🌟', 'Inspirar curiosidade'), o('🌍', 'Transformar vidas')] },
    { texto: 'Como explicarias algo difícil?', opcoes: [o('🎭', 'Com analogias'), o('📊', 'Passo a passo'), o('🌍', 'Exemplos reais'), o('🛠️', 'Actividades práticas')] },
    { texto: 'Que faixa etária preferes ensinar?', opcoes: [o('👶', 'Crianças'), o('🧑', 'Adolescentes'), o('🎓', 'Jovens adultos'), o('👨‍💼', 'Adultos')] },
    { texto: 'O que mudarias na educação?', opcoes: [o('🔧', 'Mais prática'), o('💻', 'Mais tecnologia'), o('🤲', 'Mais inclusão'), o('🎨', 'Mais criatividade')] },
  ],
  ARTES: [
    { texto: 'Como expressas emoções?', opcoes: [o('🎨', 'Desenho ou pinto'), o('✍️', 'Escrevo'), o('🎵', 'Faço música'), o('🎭', 'Represento ou danço')] },
    { texto: 'Que conteúdo crias no dia a dia?', opcoes: [o('📷', 'Visual'), o('📝', 'Escrito'), o('🎶', 'Musical'), o('🎬', 'Audiovisual')] },
    { texto: 'O que te inspira?', opcoes: [o('🌿', 'Natureza'), o('👥', 'Pessoas'), o('🇦🇴', 'Cultura angolana'), o('💭', 'Emoções internas')] },
    { texto: 'Se pudesses criar algo?', opcoes: [o('🎬', 'Um filme'), o('🎵', 'Um álbum'), o('🖼️', 'Uma exposição'), o('📖', 'Um livro')] },
    { texto: 'Que actividade te relaxa?', opcoes: [o('🎨', 'Desenhar'), o('🎧', 'Ouvir música'), o('📷', 'Fotografar'), o('✍️', 'Escrever')] },
  ],
  GERAL: [
    { texto: 'O que te imaginas a fazer em 5 anos?', opcoes: [o('💼', 'Trabalhar na minha área'), o('🏢', 'Ter negócio próprio'), o('🎓', 'Continuar a estudar'), o('🌍', 'Ajudar a comunidade')] },
    { texto: 'Qual é a tua maior motivação?', opcoes: [o('🏆', 'Sucesso profissional'), o('❤️', 'Impacto social'), o('🧘', 'Realização pessoal'), o('💰', 'Segurança financeira')] },
    { texto: 'Como preferes aprender?', opcoes: [o('🛠️', 'Na prática'), o('📖', 'A ler'), o('🧑‍🏫', 'Em aulas'), o('💬', 'Em grupo')] },
    { texto: 'O que valorizas numa profissão?', opcoes: [o('🎨', 'Criatividade'), o('🏢', 'Estabilidade'), o('🦅', 'Autonomia'), o('👥', 'Trabalho em equipa')] },
    { texto: 'Que impacto queres ter?', opcoes: [o('🏥', 'Na saúde'), o('📈', 'Na economia'), o('📚', 'Na educação'), o('🎭', 'Na cultura')] },
  ],
};

// ─── Fallback verdicts ────────────────────────────────────────────────────────

export const FALLBACK_VEREDITOS: Record<Area, Veredito> = {
  SAUDE: { area: 'Saúde', score: 75, arquetipo: 'Cuidador Analítico', proximoPasso: 'Experimenta simulações de saúde', simulacoes: ['Dia de um Médico', 'Farmácia Clínica', 'Primeiros Socorros'] },
  ENGENHARIA: { area: 'Engenharia', score: 78, arquetipo: 'Construtor Metódico', proximoPasso: 'Explora projectos de engenharia', simulacoes: ['Projecto Estrutural', 'Circuitos Eléctricos', 'Gestão de Obra'] },
  TECNOLOGIA: { area: 'Tecnologia', score: 82, arquetipo: 'Inovador Digital', proximoPasso: 'Testa simulações de programação', simulacoes: ['Hackathon Virtual', 'Análise de Dados', 'App Prototype'] },
  DIREITO: { area: 'Direito', score: 74, arquetipo: 'Defensor Lógico', proximoPasso: 'Experimenta casos simulados', simulacoes: ['Tribunal Simulado', 'Mediação de Conflitos', 'Análise Jurídica'] },
  GESTAO: { area: 'Gestão', score: 77, arquetipo: 'Líder Estratégico', proximoPasso: 'Explora cenários de gestão', simulacoes: ['Startup Weekend', 'Plano de Negócios', 'Gestão Financeira'] },
  EDUCACAO: { area: 'Educação', score: 80, arquetipo: 'Mentor Inspirador', proximoPasso: 'Experimenta aulas simuladas', simulacoes: ['Aula Interactiva', 'Pedagogia Digital', 'Tutoria Inclusiva'] },
  ARTES: { area: 'Artes', score: 76, arquetipo: 'Criador Visionário', proximoPasso: 'Explora projectos criativos', simulacoes: ['Produção Audiovisual', 'Design Digital', 'Performance Artística'] },
  GERAL: { area: 'Exploração Geral', score: 72, arquetipo: 'Explorador Versátil', proximoPasso: 'Descobre a tua área na plataforma', simulacoes: ['Teste Vocacional', 'Explorador de Carreiras', 'Mentoria Geral'] },
};
