/**
 * Seed Onboarding Videos Script (WB-T03 / ADR-031)
 * Garante que existe 1 entrada OnboardingVideo por role.
 * Idempotente: cria apenas se não existir (role é unique).
 * Standalone — corre fora do Strapi via npx tsx.
 */
import 'dotenv/config';
import { ONBOARDING_VIDEO_ROLES, ONBOARDING_VIDEO_TITLES } from '../src/shared/onboarding-video-constants';

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;
const PLACEHOLDER_VIDEO_URL = 'about:blank';

interface OnboardingVideo {
  id: number;
  documentId: string;
  role: string;
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

async function seed(): Promise<void> {
  console.log('🚀 Iniciando seed de Onboarding Videos (WB-T03)...');

  if (!STRAPI_TOKEN) {
    console.error('❌ STRAPI_API_TOKEN não configurado. Abortando.');
    process.exit(1);
  }

  for (const role of ONBOARDING_VIDEO_ROLES) {
    try {
      const getRes = await fetch(
        `${STRAPI_URL}/api/onboarding-videos?filters[role][$eq]=${role}`,
        { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` } },
      );

      if (!getRes.ok) {
        throw new Error(`Erro ao consultar role ${role}: ${getRes.status} ${getRes.statusText}`);
      }

      const existing = await getRes.json() as StrapiListResponse<OnboardingVideo>;

      if (existing.data && existing.data.length > 0) {
        console.log(`⏭️  OnboardingVideo role="${role}" já existe — skipping.`);
        continue;
      }

      const titles = ONBOARDING_VIDEO_TITLES[role];
      // FIXME: substituir placeholder por URL real de R2 quando disponível.
      if (process.env.NODE_ENV === 'production' && PLACEHOLDER_VIDEO_URL === 'about:blank') {
        throw new Error(`Seed bloqueado em produção: videoUrl placeholder para role "${role}"`);
      }
      const postRes = await fetch(`${STRAPI_URL}/api/onboarding-videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STRAPI_TOKEN}`,
        },
        body: JSON.stringify({
          data: {
            role,
            videoUrl: PLACEHOLDER_VIDEO_URL,
            embedType: 'r2',
            duracaoSegundos: 0,
            thumbnailUrl: '',
            tituloPt: titles.pt,
            tituloEn: titles.en,
          },
        }),
      });

      if (!postRes.ok) {
        const error = await postRes.text();
        throw new Error(`Falha ao criar OnboardingVideo role="${role}": ${error}`);
      }

      console.log(`✅ OnboardingVideo role="${role}" criado (placeholder).`);
    } catch (err: unknown) {
      console.error(
        `❌ Erro no processamento do role "${role}":`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.log('🏁 Seed de Onboarding Videos concluído.');
}

seed().catch(console.error);
