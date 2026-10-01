import { beforeEach, describe, expect, it, vi } from 'vitest';
import { app, list, record, request, resetMocks } from './experiencias-vwx.test-support.js';
import { strapiGet, strapiPut } from '../modules/strapi/strapi.client.js';
import { readinessIssues, type ExperienceRecord } from '../modules/experiencias/experience.service.js';

const legacy: ExperienceRecord = {
  id: 20,
  documentId: 'legacy-experience',
  slug: 'experiencia-antiga',
  titulo: 'Formação em Engenharia',
  descricao: 'Conhece a formação e as instalações da instituição.',
  estado: 'draft',
  gratuito: true,
  validadoAcademicamente: false,
  autor: { userId: 'creator' },
  painelRealidade: { taxaEmpregabilidade: '80%' },
  muralVozes: ['Ana', 'Bruno', 'Carla'].map((autor) => ({
    tipo: 'aluno', autor, depoimento: 'A formação inclui prática em laboratório.',
  })),
  guiaInstitucional: { laboratorios: 'Laboratório de engenharia.' },
};

describe('Experiências — compatibilidade da validação editorial', () => {
  beforeEach(resetMocks);

  it.each([undefined, []])('aceita os três painéis legados sem secções (%j)', (secoes) => {
    expect(readinessIssues({ ...legacy, secoes })).toEqual([]);
  });

  it.each([
    { painelRealidade: undefined },
    { muralVozes: undefined },
    { muralVozes: [] },
    { muralVozes: legacy.muralVozes?.slice(0, 2) },
    { guiaInstitucional: undefined },
    { titulo: '  ' },
    { descricao: '  ' },
    { descricao: null },
  ])('bloqueia formato legado incompleto: %j', (missing) => {
    expect(readinessIssues({ ...legacy, ...missing }).length).toBeGreaterThan(0);
  });

  it('não usa painéis legados para contornar secções modulares incompletas', () => {
    expect(readinessIssues({ ...legacy, secoes: [{
      id: 'welcome', tipo: 'boas_vindas', titulo: 'Boas-vindas', ordem: 0,
      obrigatoria: true, visibilidade: 'publico', itens: [],
    }] })).toHaveLength(6);
  });

  it('não aceita VWX sem as sete etapas, mesmo com painéis legados', () => {
    expect(readinessIssues({ ...legacy, tipoExperiencia: 'vwx', vwx: record.vwx }))
      .toHaveLength(7);
  });

  it.each(['conteudo', 'mediaUrl', 'arquivoUrl', 'cta'] as const)(
    'não considera %s vazio como conteúdo de uma secção', (field) => {
      const secoes = record.secoes?.map((section) => ({
        ...section,
        itens: [{ id: 'empty', tipo: 'texto' as const, titulo: 'Conteúdo', ordem: 0,
          ...(field === 'cta' ? { cta: { label: 'Abrir', url: '  ' } } : { [field]: '  ' }),
        }],
      }));
      expect(readinessIssues({ ...record, secoes })).toHaveLength(7);
    }
  );

  it('aceita CTA com URL preenchido como conteúdo', () => {
    const secoes = record.secoes?.map((section) => ({
      ...section,
      itens: [{ id: 'cta', tipo: 'cta' as const, titulo: 'Abrir recurso', ordem: 0,
        cta: { label: 'Abrir', url: 'https://example.com/recurso' },
      }],
    }));
    expect(readinessIssues({ ...record, secoes })).toEqual([]);
  });

  it('submete um rascunho legado completo sem o converter nem alterar conteúdo', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([legacy]));
    const response = await request('/legacy-experience/submeter', {});
    expect(response.status).toBe(200);
    expect(strapiPut).toHaveBeenCalledExactlyOnceWith(
      '/experiencias/legacy-experience', { estado: 'review' }, { status: 'draft' }
    );
  });

  it('rejeita submissão incompleta com indicação do painel em falta e sem escrita', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...legacy, muralVozes: [] }]));
    const response = await request('/legacy-experience/submeter', {});
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      issues: ['Completar conteúdo: muralVozes (mínimo 3 depoimentos)'],
    });
    expect(strapiPut).not.toHaveBeenCalled();
  });

  it('mantém a publicação em duas versões para uma experiência legada aprovada', async () => {
    vi.mocked(strapiGet).mockResolvedValue(list([{ ...legacy, estado: 'approved' }]));
    const response = await app.request('/experiencias/legacy-experience/estado', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-role': 'super_admin' },
      body: JSON.stringify({ estado: 'published' }),
    });
    expect(response.status).toBe(200);
    expect(strapiPut).toHaveBeenNthCalledWith(1,
      '/experiencias/legacy-experience', { estado: 'approved' }, { status: 'published' });
    expect(strapiPut).toHaveBeenNthCalledWith(2,
      '/experiencias/legacy-experience', { estado: 'published' }, { status: 'draft' });
  });
});
