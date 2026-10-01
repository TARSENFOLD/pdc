import { describe, expect, it } from 'vitest';
import { recoverExperienceDraft } from './experience-draft';

describe('Rascunhos de Experiências e VWX', () => {
  it('preserva um título e descrição ainda incompletos', () => {
    const result = recoverExperienceDraft(JSON.stringify({ titulo: 'A', descricao: '' }), false);
    expect(result.titulo).toBe('A');
    expect(result.descricao).toBe('');
  });
  const legacy = {
    titulo: 'Draft legado',
    descricao: 'Descrição válida do conteúdo.',
    area: 'TECNOLOGIA',
    nivel: 'medio',
    modalidade: 'presencial',
    painelRealidade: { principaisEmpregadores: ['BAI'] },
  };
  it('recupera empregadores antigos sem apagar conteúdo', () => {
    const result = recoverExperienceDraft(JSON.stringify(legacy), false);
    expect(result.painelRealidade?.principaisEmpregadores).toEqual([{ nome: 'BAI' }]);
    expect(result.secoes).toHaveLength(6);
    expect(result.tipoExperiencia).toBe('institucional');
  });
  it('não converte um rascunho VWX numa Experiência', () => {
    expect(() =>
      recoverExperienceDraft(JSON.stringify({ ...legacy, tipoExperiencia: 'vwx' }), false)
    ).toThrow('Tipo de rascunho');
  });
  it('não aceita conteúdo local corrompido', () => {
    expect(() => recoverExperienceDraft('{invalid', false)).toThrow();
  });
});
