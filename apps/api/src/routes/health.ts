import { Hono } from 'hono';
import { strapiGet } from '../modules/strapi/strapi.client.js';
import { Features } from '@pdc/shared';

export const healthRoutes = new Hono();

healthRoutes.get('/', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

interface StrapiFeatureFlag {
  domain: string;
  enabled: boolean;
}

interface StrapiProgram {
  id: string;
  descricao?: string;
  proposito?: string;
}

interface StrapiProjeto {
  id: string;
  descricao?: string;
  abstract?: string;
}

interface StrapiSimulacao {
  id: string;
  materiaisInfo?: string;
  materiaisLab?: unknown;
}

/**
 * Health Check: Feature Registry Integrity
 * Verifica se todos os HUBs soberanos e flags canónicas do @pdc/shared
 * têm uma entrada correspondente no Strapi.
 */
healthRoutes.get('/feature-registry', async (c) => {
  try {
    const res = await strapiGet<StrapiFeatureFlag>('/feature-flags', {
      'fields[0]': 'domain',
      'fields[1]': 'enabled',
    });

    const items = Array.isArray(res?.data) ? res.data : [];
    const strapiKeys = new Set(items.map((f) => f.domain));
    const registryKeys = Object.keys(Features);

    const missing = registryKeys.filter((k) => !strapiKeys.has(k));

    if (missing.length > 0) {
      return c.json({
        status: 'drift',
        missing,
        message: 'Feature flags em drift entre registry e Strapi',
      }, 503);
    }

    return c.json({
      status: 'synced',
      message: 'Feature flags sincronizados',
    });
  } catch (err) {
    console.error({ err, route: 'health', feature: 'feature-registry' }, 'Erro ao verificar feature registry');
    return c.json({ error: 'Erro ao verificar feature registry' }, 502);
  }
});

/**
 * Health Check: Editorial Schema Drift
 * Detecta drift editorial em campos legacy vs novos.
 */
healthRoutes.get('/schema-drift', async (c) => {
  try {
    // Programa: descricao (DEPRECATED) vs proposito
    const programasRes = await strapiGet<StrapiProgram>('/programas', {
      'fields[0]': 'id',
      'fields[1]': 'descricao',
      'fields[2]': 'proposito',
      'pagination[limit]': '5000', // Aumentado para cobrir maior volume sem paginação complexa para healthcheck
    });

    const programaDrift = (programasRes.data || []).filter((p) => 
      p.descricao && !p.proposito
    ).length;

    // Projeto: descricao (DEPRECATED) vs abstract
    const projetosRes = await strapiGet<StrapiProjeto>('/projetos', {
      'fields[0]': 'id',
      'fields[1]': 'descricao',
      'fields[2]': 'abstract',
      'pagination[limit]': '5000', // Aumentado para cobrir maior volume sem paginação complexa para healthcheck
    });

    const projetoDrift = (projetosRes.data || []).filter((p) => 
      p.descricao && !p.abstract
    ).length;

    // Simulação: materiaisInfo (DEPRECATED) vs materiaisLab
    const simulacoesRes = await strapiGet<StrapiSimulacao>('/simulacoes', {
      'fields[0]': 'id',
      'fields[1]': 'materiaisInfo',
      'fields[2]': 'materiaisLab',
      'pagination[limit]': '5000',
    });

    const simulacaoDrift = (simulacoesRes.data || []).filter((s) => 
      s.materiaisInfo && !s.materiaisLab
    ).length;

    const totalDrift = programaDrift + projetoDrift + simulacaoDrift;

    return c.json({
      status: totalDrift > 0 ? 'drift' : 'synced',
      drift: {
        programas: programaDrift,
        projetos: projetoDrift,
        simulacoes: simulacaoDrift,
        total: totalDrift,
      },
      message: totalDrift > 0 
        ? `${totalDrift} registos com drift editorial detectados` 
        : 'Esquemas editoriais sincronizados',
    }, totalDrift > 0 ? 503 : 200);
  } catch (err) {
    console.error({ err, route: 'health', feature: 'schema-drift' }, 'Erro ao verificar schema drift');
    return c.json({ error: 'Erro ao verificar schema drift' }, 502);
  }
});
