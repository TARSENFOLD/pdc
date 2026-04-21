export interface TinaKnowledgeItem {
  categoria: string;
  titulo: string;
  conteudo: string;
}

export const TINA_KNOWLEDGE: TinaKnowledgeItem[] = [
  {
    categoria: 'páginas',
    titulo: 'Dashboard',
    conteudo: 'URL: /app/dashboard. Acesso: Todos os utilizadores autenticados. Descrição: Vista geral do progresso, cursos e recomendações.',
  },
  {
    categoria: 'páginas',
    titulo: 'Simulações',
    conteudo: 'URL: /app/simulacoes. Acesso: Estudantes. Descrição: Lista de simulações práticas de profissões.',
  },
  {
    categoria: 'features',
    titulo: 'Perfil Vocacional',
    conteudo: 'Como funciona: Calculado automaticamente com base no desempenho em simulações. Onde está: No Dashboard e na página de Perfil.',
  },
  {
    categoria: 'roles',
    titulo: 'Estudante',
    conteudo: 'O que pode fazer: Realizar simulações, inscrever-se em cursos, ver relatórios vocacionais e solicitar mentorias.',
  },
  {
    categoria: 'roles',
    titulo: 'Mentor',
    conteudo: 'O que pode fazer: Aceitar pedidos de mentoria, orientar estudantes e partilhar experiências profissionais.',
  },
  {
    categoria: 'FAQ',
    titulo: 'O que é o PDC?',
    conteudo: 'O Por Dentro do Curso (PDC) é uma plataforma angolana que ajuda estudantes a escolherem carreiras através de simulações práticas.',
  },
  {
    categoria: 'FAQ',
    titulo: 'As simulações são pagas?',
    conteudo: 'Existem simulações gratuitas (Tipo 1) e simulações mais avançadas que podem fazer parte de programas específicos.',
  },
  {
    categoria: 'FAQ',
    titulo: 'Como obtenho um certificado?',
    conteudo: 'Os certificados são emitidos após a conclusão com sucesso de todos os módulos de um curso.',
  },
  {
    categoria: 'FAQ',
    titulo: 'Posso mudar de curso?',
    conteudo: 'Sim, a ideia do PDC é que experimentes vários cursos e simulações até encontrares a tua verdadeira vocação.',
  },
  {
    categoria: 'FAQ',
    titulo: 'Quem são os mentores?',
    conteudo: 'Os mentores são profissionais experientes e professores que se voluntariam para guiar a nova geração.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Diagnóstico Clínico (SAUDE)',
    conteudo: 'Uma simulação prática focada em triagem e diagnóstico básico para interessados na área da saúde.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Cálculo Estrutural (ENGENHARIA)',
    conteudo: 'Desafios de resistência de materiais e planeamento de infraestruturas.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Desenvolvimento de Software (TECNOLOGIA)',
    conteudo: 'Resolução de problemas algorítmicos e arquitetura de sistemas digitais.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Tribunal e Argumentação (DIREITO)',
    conteudo: 'Análise de casos jurídicos e preparação de teses de defesa/acusação.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Gestão de Crise Empresarial (GESTAO)',
    conteudo: 'Tomada de decisão sob pressão financeira e liderança de equipas.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Planeamento Pedagógico (EDUCACAO)',
    conteudo: 'Desenho de estratégias de ensino e gestão de sala de aula.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Curadoria de Exposição (ARTES)',
    conteudo: 'Organização de espaços artísticos e narrativa visual.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Gestão de Produção Rural (CIENCIAS_AGRARIAS)',
    conteudo: 'Otimização de colheitas e sustentabilidade no agronegócio.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Análise de Impacto Comunitário (CIENCIAS_SOCIAIS)',
    conteudo: 'Estudos sociológicos e intervenção em problemas sociais reais.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Redação de Notícia e Media (COMUNICACAO)',
    conteudo: 'Ética jornalística e produção de conteúdo para massa.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Laboratório de Química/Biologia (CIENCIAS_NATURAIS)',
    conteudo: 'Experiências científicas controladas e análise de substâncias.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Design de Espaço Urbano (ARQUITETURA)',
    conteudo: 'Projetos de habitabilidade e estética das cidades.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Gestão Hoteleira e Hospitalidade (TURISMO_HOTELARIA)',
    conteudo: 'Operações de serviço de luxo e hospitalidade internacional.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação de Treino e Alta Performance (DESPORTO)',
    conteudo: 'Fisiologia do exercício e gestão de carreiras desportivas.',
  },
  {
    categoria: 'simulacoes_base',
    titulo: 'Simulação Geral de Aptidões Transversais (OUTRA)',
    conteudo: 'Avaliação de competências lógicas, comunicativas e organizacionais para áreas não listadas.',
  },
];
