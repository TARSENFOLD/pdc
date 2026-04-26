/**
 * Seed de Copy Soberano (UI Strings)
 * Mandato: Zero Implementações Vazias
 */

import axios from 'axios';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

const INITIAL_STRINGS = [
  {
    key: 'landing.hero.title',
    value: 'O teu futuro não é um palpite. É uma ciência de mérito.',
    contexto: 'landing',
    tom_de_voz: 'Aspiracional, Elite, Seguro.',
    comentario_dev: 'Título principal da Landing Page'
  },
  {
    key: 'landing.hero.subtitle',
    value: 'A primeira plataforma soberana de aceleração de capital humano em Angola.',
    contexto: 'landing',
    tom_de_voz: 'Institucional, Sóbrio.',
    comentario_dev: 'Subtítulo do Hero'
  },
  {
    key: 'landing.hero.cta.primary',
    value: 'Começar Percurso',
    contexto: 'landing',
    tom_de_voz: 'Direto, Motivador.',
    comentario_dev: 'Botão principal'
  },
  // HomePage
  {
    key: 'home.error.title',
    value: 'O Oráculo está temporariamente offline.',
    contexto: 'home',
    tom_de_voz: 'Sóbrio, Técnico.',
    comentario_dev: 'Erro ao carregar dashboard'
  },
  {
    key: 'home.error.retry',
    value: 'Tentar Reconectar',
    contexto: 'home',
    tom_de_voz: 'Direto.',
    comentario_dev: 'Botão de retry'
  },
  {
    key: 'home.greeting.fallback',
    value: 'Talento',
    contexto: 'home',
    tom_de_voz: 'Inspirador.',
    comentario_dev: 'Nome fallback se não houver user'
  },
  {
    key: 'home.header.status',
    value: 'Pulso Soberano Ativo',
    contexto: 'home',
    tom_de_voz: 'Tecnológico.',
    comentario_dev: 'Status do sistema'
  },
  {
    key: 'home.stats.reputation.label',
    value: 'Potencial Bio',
    contexto: 'home',
    tom_de_voz: 'Elite.',
    comentario_dev: 'Label de reputação'
  },
  {
    key: 'home.mission.active.label',
    value: 'Missão Prioritária',
    contexto: 'home',
    tom_de_voz: 'Urgente, Focado.',
    comentario_dev: 'Badge de missão ativa'
  },
  {
    key: 'home.mission.active.cta',
    value: 'Iniciar Agora',
    contexto: 'home',
    tom_de_voz: 'Motivador.',
    comentario_dev: 'CTA de missão'
  },
  {
    key: 'home.mission.empty.title',
    value: 'Pronto para o Próximo Salto',
    contexto: 'home',
    tom_de_voz: 'Aspiracional.',
    comentario_dev: 'Título quando sem missão'
  },
  {
    key: 'home.mission.empty.description',
    value: 'Explora o ecossistema para encontrares a tua próxima missão de mérito.',
    contexto: 'home',
    tom_de_voz: 'Incentivador.',
    comentario_dev: 'Desc quando sem missão'
  },
  {
    key: 'home.social.title',
    value: 'Social Pulse',
    contexto: 'home',
    tom_de_voz: 'Moderno.',
    comentario_dev: 'Título do feed social'
  },
  {
    key: 'home.social.time_ago',
    value: 'HÁ POUCO',
    contexto: 'home',
    tom_de_voz: 'Conciso.',
    comentario_dev: 'Relative time label'
  },
  {
    key: 'home.social.empty.title',
    value: 'Pulso Social Silencioso',
    contexto: 'home',
    tom_de_voz: 'Calmo.',
    comentario_dev: 'Empty state social pulse'
  },
  {
    key: 'home.social.empty.description',
    value: 'O ecossistema está a aguardar o teu próximo rasto de impacto.',
    contexto: 'home',
    tom_de_voz: 'Inspirador.',
    comentario_dev: 'Empty state desc social'
  },
  {
    key: 'home.social.sync',
    value: 'Sincronização Completa',
    contexto: 'home',
    tom_de_voz: 'Técnico.',
    comentario_dev: 'Rodapé do social pulse'
  },
  {
    key: 'home.stats.achievements.label',
    value: 'Conquistas',
    contexto: 'home',
    tom_de_voz: 'Institucional.',
    comentario_dev: 'Métrica de conquistas'
  },
  {
    key: 'home.stats.connections.label',
    value: 'Vínculos',
    contexto: 'home',
    tom_de_voz: 'Institucional.',
    comentario_dev: 'Métrica de conexões'
  },
  {
    key: 'home.quick_actions.title',
    value: 'Ações Rápidas',
    contexto: 'home',
    tom_de_voz: 'Funcional.',
    comentario_dev: 'Título secção ações rápidas'
  },
  // Landing Page
  {
    key: 'landing.features.badge',
    value: 'Funcionalidades',
    contexto: 'landing',
    tom_de_voz: 'Institucional.',
    comentario_dev: 'Badge de secção'
  },
  {
    key: 'landing.features.title',
    value: 'Tudo o que precisas, num só lugar',
    contexto: 'landing',
    tom_de_voz: 'Sóbrio.',
    comentario_dev: 'Título das funcionalidades'
  },
  {
    key: 'landing.how_it_works.badge',
    value: 'Como funciona',
    contexto: 'landing',
    tom_de_voz: 'Institucional.',
    comentario_dev: 'Badge de secção'
  },
  {
    key: 'landing.how_it_works.title',
    value: 'Três passos. Uma decisão segura.',
    contexto: 'landing',
    tom_de_voz: 'Confiante.',
    comentario_dev: 'Título de como funciona'
  },
  // Auth
  {
    key: 'auth.onboarding.badge',
    value: 'PDC - Onboarding',
    contexto: 'auth',
    tom_de_voz: 'Sistemático.',
    comentario_dev: 'Badge de onboarding'
  },
  {
    key: 'auth.onboarding.title',
    value: 'Como queres usar o PDC?',
    contexto: 'auth',
    tom_de_voz: 'Direto.',
    comentario_dev: 'Título escolha de conta'
  },
  {
    key: 'auth.onboarding.subtitle',
    value: 'Escolhe o teu perfil para personalizar a tua infraestrutura de decisão.',
    contexto: 'auth',
    tom_de_voz: 'Sério.',
    comentario_dev: 'Subtítulo escolha de conta'
  },
  {
    key: 'auth.roles.student.title',
    value: 'Estudante',
    contexto: 'auth',
    tom_de_voz: 'Institucional.',
    comentario_dev: 'Título perfil estudante'
  },
  {
    key: 'auth.roles.student.desc',
    value: 'Descobre a tua vocação e explora carreiras com IA.',
    contexto: 'auth',
    tom_de_voz: 'Inspirador.',
    comentario_dev: 'Desc perfil estudante'
  },
  {
    key: 'auth.common.login_link_prefix',
    value: 'Já tens uma conta ativa?',
    contexto: 'auth',
    tom_de_voz: 'Normal.',
    comentario_dev: 'Prefixo do link de login'
  },
  {
    key: 'auth.common.login_link_action',
    value: 'Entrar agora',
    contexto: 'auth',
    tom_de_voz: 'Direto.',
    comentario_dev: 'Ação do link de login'
  },
  // Features
  {
    key: 'landing.features.items.simulations.title',
    value: 'Simulações práticas',
    contexto: 'landing',
    tom_de_voz: 'Direto.',
    comentario_dev: 'Título feature 1'
  },
  {
    key: 'landing.features.items.simulations.desc',
    value: 'Vídeo guiado, laboratório externo ou ambiente interativo - experimenta o dia a dia real de cada profissão.',
    contexto: 'landing',
    tom_de_voz: 'Explicativo.',
    comentario_dev: 'Desc feature 1'
  },
  {
    key: 'landing.features.items.profile.title',
    value: 'Perfil vocacional',
    contexto: 'landing',
    tom_de_voz: 'Inovador.',
    comentario_dev: 'Título feature 2'
  },
  {
    key: 'landing.features.items.profile.desc',
    value: 'Gerado a partir do teu comportamento nas simulações. Sem questionários genéricos.',
    contexto: 'landing',
    tom_de_voz: 'Explicativo.',
    comentario_dev: 'Desc feature 2'
  },
  {
    key: 'landing.features.items.courses.title',
    value: 'Cursos com certificado',
    contexto: 'landing',
    tom_de_voz: 'Institucional.',
    comentario_dev: 'Título feature 3'
  },
  {
    key: 'landing.features.items.courses.desc',
    value: 'Módulos, tarefas e certificados emitidos por instituições parceiras.',
    contexto: 'landing',
    tom_de_voz: 'Direto.',
    comentario_dev: 'Desc feature 3'
  },
  // Steps
  {
    key: 'landing.steps.1.title',
    value: 'Simula uma profissão',
    contexto: 'landing',
    tom_de_voz: 'Direto.',
    comentario_dev: 'Título passo 1'
  },
  {
    key: 'landing.steps.1.desc',
    value: 'Escolhe uma área e entra numa simulação prática que replica situações reais do dia a dia profissional.',
    contexto: 'landing',
    tom_de_voz: 'Explicativo.',
    comentario_dev: 'Desc passo 1'
  },
  {
    key: 'landing.steps.2.title',
    value: 'A plataforma analisa',
    contexto: 'landing',
    tom_de_voz: 'Técnico.',
    comentario_dev: 'Título passo 2'
  },
  {
    key: 'landing.steps.2.desc',
    value: 'As tuas acções, tempo e decisões geram um perfil vocacional único - baseado em comportamento, não em respostas a questionários.',
    contexto: 'landing',
    tom_de_voz: 'Explicativo.',
    comentario_dev: 'Desc passo 2'
  },
  {
    key: 'landing.steps.3.title',
    value: 'Decides com clareza',
    contexto: 'landing',
    tom_de_voz: 'Confiante.',
    comentario_dev: 'Título passo 3'
  },
  {
    key: 'landing.steps.3.desc',
    value: 'Recebes recomendações de cursos e áreas alinhadas ao teu perfil real. Sem adivinhação.',
    contexto: 'landing',
    tom_de_voz: 'Explicativo.',
    comentario_dev: 'Desc passo 3'
  }
];

const AXIOS_TIMEOUT = 10000; // 10 seconds

async function seedCopy(): Promise<void> {
  console.log('🌱 Iniciando Seed de Copy Soberano...');

  if (!API_TOKEN) {
    console.error('❌ STRAPI_API_TOKEN não definido no ambiente.');
    process.exit(1);
  }

  const axiosConfig = {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    timeout: AXIOS_TIMEOUT,
  };

  for (const item of INITIAL_STRINGS) {
    try {
      // Verificar se já existe (URL encoded)
      const existing = await axios.get(
        `${STRAPI_URL}/api/ui-strings?filters[key][$eq]=${encodeURIComponent(item.key)}`,
        axiosConfig
      );
      
      const records = existing.data?.data;
      if (!Array.isArray(records)) {
        console.error(`❌ Resposta inesperada para ${item.key}`);
        continue;
      }
      
      if (records.length === 0) {
        await axios.post(`${STRAPI_URL}/api/ui-strings`, { data: item }, axiosConfig);
        console.log(`✅ Chave criada: ${item.key}`);
      } else {
        console.log(`⏩ Chave já existe: ${item.key}`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao processar ${item.key}:`, msg);
    }
  }
}

seedCopy().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error('❌ Erro fatal no seed:', msg);
  process.exit(1);
});
