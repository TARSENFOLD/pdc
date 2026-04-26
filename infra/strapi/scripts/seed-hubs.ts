/**
 * Seed Hubs Script (Wave 4)
 * Garante que os 6 HUBs soberanos existem como Feature Flags no Strapi.
 */
import 'dotenv/config';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

interface FeatureFlag {
  id: number;
  documentId: string;
  domain: string;
  enabled: boolean;
  description: string | null;
}

interface StrapiListResponse<T> {
  data: T[];
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

const HUBS = [
  { domain: 'HUB_LEARN', description: 'Hub de Aprendizagem (Simulações, Cursos)' },
  { domain: 'HUB_EXPLORE', description: 'Hub Institucional (Experiências, Catálogo)' },
  { domain: 'HUB_FUTURE', description: 'Hub de Futuro (Relatório, Reputação, Certificados)' },
  { domain: 'HUB_COMMUNITY', description: 'Hub Social (Feed, Ranking, Vínculos)' },
  { domain: 'HUB_MENTOR', description: 'Hub do Mentor (Gestão de Cursos e Labs)' },
  { domain: 'HUB_INSTITUTION', description: 'Hub da Instituição (Gestão de Vitrinas e Roteiros)' },
];

async function seed(): Promise<void> {
  console.log('🚀 Iniciando seed de HUB Feature Flags...');

  if (!STRAPI_TOKEN) {
    console.error('❌ STRAPI_API_TOKEN não configurado. Abortando.');
    process.exit(1);
  }

  for (const hub of HUBS) {
    try {
      // 1. Verificar se já existe
      const getRes = await fetch(`${STRAPI_URL}/api/feature-flags?filters[domain][$eq]=${hub.domain}`, {
        headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
      });

      if (!getRes.ok) {
        throw new Error(`Erro ao consultar ${hub.domain}: ${getRes.status} ${getRes.statusText}`);
      }

      const existing = await getRes.json() as StrapiListResponse<FeatureFlag>;

      if (existing.data && existing.data.length > 0) {
        console.log(`🟡 Hub ${hub.domain} já existe. Ignorando.`);
        continue;
      }

      // 2. Criar se não existir
      const postRes = await fetch(`${STRAPI_URL}/api/feature-flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            domain: hub.domain,
            enabled: true,
            description: hub.description,
          }
        }),
      });

      if (!postRes.ok) {
        const error = await postRes.text();
        throw new Error(`Falha ao criar ${hub.domain}: ${error}`);
      }

      console.log(`✅ Hub ${hub.domain} criado com sucesso.`);
    } catch (err: unknown) {
      console.error(`❌ Erro no processamento do hub ${hub.domain}:`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log('🏁 Seed de HUBs concluído.');
}

seed().catch(console.error);
