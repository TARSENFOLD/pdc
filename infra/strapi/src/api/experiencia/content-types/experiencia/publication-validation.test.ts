import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateExperiencePublication as validate } from './publication-validation';

const base = { titulo: 'Experiência de teste', descricao: 'Descrição', estado: 'review' };
const sections = (types: string[]) =>
  types.map((tipo) => ({ tipo, itens: [{ conteudo: 'Conteúdo real' }] }));
const experience = {
  ...base,
  secoes: sections([
    'boas_vindas',
    'realidade',
    'curriculo',
    'depoimentos',
    'infraestrutura',
    'proximos_passos',
  ]),
};
const vwx = {
  ...base,
  tipoExperiencia: 'vwx',
  vwx: { profissao: 'Analista', entidade: 'Parceiro', objetivo: 'Analisar' },
  secoes: sections([
    'contexto',
    'briefing',
    'exploracao',
    'pratica',
    'entregavel',
    'debrief',
    'reflexao',
  ]),
};

test('drafts may be incomplete', () => assert.doesNotThrow(() => validate({ estado: 'draft' })));
test('modular experiences do not require legacy panels', () =>
  assert.doesNotThrow(() => validate(experience)));
test('all six institutional groups need content', () =>
  assert.throws(
    () => validate({ ...experience, secoes: experience.secoes.slice(1) }),
    /boas_vindas/
  ));
test('empty placeholders cannot pass review', () =>
  assert.throws(
    () => validate({ ...experience, secoes: experience.secoes.map((s) => ({ ...s, itens: [] })) }),
    /Experiência bloqueada/
  ));
test('legacy published experiences remain valid', () =>
  assert.doesNotThrow(() =>
    validate({ ...base, painelRealidade: {}, muralVozes: [{}, {}, {}], guiaInstitucional: {} })
  ));
test('VWX review uses professional stages only', () => assert.doesNotThrow(() => validate(vwx)));
test('VWX cannot mix institutional panels', () =>
  assert.throws(() => validate({ ...vwx, painelRealidade: {} }), /painéis institucionais/));
test('VWX cannot skip any professional stage', () =>
  assert.throws(() => validate({ ...vwx, secoes: vwx.secoes.slice(1) }), /contexto/));
test('publication needs partner validation, including create of a published version', () => {
  assert.throws(
    () => validate({ ...vwx, publishedAt: new Date().toISOString() }),
    /validação do parceiro/
  );
  assert.doesNotThrow(() =>
    validate({
      ...vwx,
      publishedAt: new Date().toISOString(),
      vwxValidacao: { referencia: 'Revisão aprovada' },
    })
  );
});
