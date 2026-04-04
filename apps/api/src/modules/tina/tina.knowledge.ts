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
    conteudo: 'URL: /app/simulacoes. Acesso: Alunos. Descrição: Lista de simulações práticas de profissões.',
  },
  {
    categoria: 'features',
    titulo: 'Perfil Vocacional',
    conteudo: 'Como funciona: Calculado automaticamente com base no desempenho em simulações. Onde está: No Dashboard e na página de Perfil.',
  },
  {
    categoria: 'roles',
    titulo: 'Aluno',
    conteudo: 'O que pode fazer: Realizar simulações, inscrever-se em cursos, ver relatórios vocacionais e solicitar mentorias.',
  },
  {
    categoria: 'roles',
    titulo: 'Mentor',
    conteudo: 'O que pode fazer: Aceitar pedidos de mentoria, orientar alunos e partilhar experiências profissionais.',
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
];
