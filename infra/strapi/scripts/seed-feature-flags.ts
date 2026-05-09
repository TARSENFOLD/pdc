/**
 * Seed Feature Flags Script (PROD-A-T02)
 * Garante que as feature flags operacionais existem no Strapi.
 * Idempotente: cria se não existir, actualiza enabled/description se já existir.
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

const FLAGS = [
  {
    domain: 'APPROVAL_ENFORCEMENT_ENABLED',
    enabled: false,
    description: 'Enforces approval gate before newly registered users can create content (BETA)',
  },
  {
    domain: 'OAUTH_ONBOARDING_REQUIRED',
    enabled: true,
    description: 'Requires OAuth users to complete role-selection onboarding before accessing the platform (STABLE)',
  },
  {
    domain: 'SIM_TIPO_2_PUBLISH_ENABLED',
    enabled: false,
    description: 'Allows publishing simulation Tipo 2 with telemetry-driven scoring pipeline (STABLE — operator must enable)',
  },
  {
    domain: 'SIM_TIPO_3_PUBLISH_ENABLED',
    enabled: false,
    description: 'Allows publishing simulation Tipo 3 with telemetry-driven scoring pipeline (STABLE — operator must enable)',
  },
];

async function seed(): Promise<void> {
  console.log('🚀 Iniciando seed de Feature Flags (PROD-A-T02)...');

  if (!STRAPI_TOKEN) {
    console.error('❌ STRAPI_API_TOKEN não configurado. Abortando.');
    process.exit(1);
  }

  for (const flag of FLAGS) {
    try {
      const getRes = await fetch(
        `${STRAPI_URL}/api/feature-flags?filters[domain][$eq]=${flag.domain}`,
        { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` } },
      );

      if (!getRes.ok) {
        throw new Error(`Erro ao consultar ${flag.domain}: ${getRes.status} ${getRes.statusText}`);
      }

      const existing = await getRes.json() as StrapiListResponse<FeatureFlag>;

      if (existing.data && existing.data.length > 0) {
        const existingFlag = existing.data[0];
        const docId = existingFlag.documentId ?? String(existingFlag.id);
        const putRes = await fetch(`${STRAPI_URL}/api/feature-flags/${docId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${STRAPI_TOKEN}`,
          },
          body: JSON.stringify({
            data: {
              enabled: flag.enabled,
              description: flag.description,
            },
          }),
        });

        if (!putRes.ok) {
          const error = await putRes.text();
          throw new Error(`Falha ao actualizar ${flag.domain}: ${error}`);
        }

        console.log(`🔄 Flag ${flag.domain} actualizada (enabled=${flag.enabled}).`);
        continue;
      }

      const postRes = await fetch(`${STRAPI_URL}/api/feature-flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            domain: flag.domain,
            enabled: flag.enabled,
            description: flag.description,
          },
        }),
      });

      if (!postRes.ok) {
        const error = await postRes.text();
        throw new Error(`Falha ao criar ${flag.domain}: ${error}`);
      }

      console.log(`✅ Flag ${flag.domain} criada (enabled=${flag.enabled}).`);
    } catch (err: unknown) {
      console.error(
        `❌ Erro no processamento da flag ${flag.domain}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.log('🏁 Seed de Feature Flags concluído.');
}

seed().catch(console.error);
