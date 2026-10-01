import {
  VWX_SECTION_TYPES,
  VWX_SECTION_LABELS,
  type CriarExperienciaPayload,
  type Experiencia,
} from '@pdc/shared';
import { newExperienceSection } from './experience-section-factory';

export function experienceDefaults(vwx: boolean): CriarExperienciaPayload {
  return {
    tipoExperiencia: vwx ? 'vwx' : 'institucional',
    titulo: '',
    descricao: '',
    area: 'TECNOLOGIA',
    nivel: 'basico',
    modalidade: 'online',
    ...(vwx
      ? { vwx: { profissao: '', entidade: '', objetivo: '' } }
      : {
          painelRealidade: { principaisEmpregadores: [] },
          muralVozes: [],
          guiaInstitucional: { fotosCampus: [], timelineCurricular: [] },
        }),
    secoes: vwx
      ? VWX_SECTION_TYPES.map((tipo, index) => ({
          ...newExperienceSection(tipo, index, VWX_SECTION_LABELS[tipo]),
          obrigatoria: true,
        }))
      : [
          newExperienceSection('boas_vindas', 0, 'Boas-vindas'),
          newExperienceSection('realidade', 1, 'Realidade da área'),
          newExperienceSection('curriculo', 2, 'Percurso e currículo'),
          newExperienceSection('depoimentos', 3, 'Vozes da comunidade'),
          newExperienceSection('infraestrutura', 4, 'Infraestrutura'),
          newExperienceSection('proximos_passos', 5, 'Próximos passos'),
        ],
  };
}

export function experienceFormValues(exp: Experiencia): CriarExperienciaPayload {
  const defaults = experienceDefaults(exp.tipoExperiencia === 'vwx');
  return {
    ...defaults,
    titulo: exp.titulo,
    descricao: exp.descricao,
    area: exp.area ?? defaults.area,
    nivel: exp.nivel ?? defaults.nivel,
    modalidade: exp.modalidade ?? defaults.modalidade,
    capaUrl: exp.capaUrl ?? undefined,
    duracaoEstimada: exp.duracaoEstimada ?? undefined,
    secoes: exp.secoes ?? defaults.secoes,
    ...(exp.tipoExperiencia === 'vwx'
      ? { vwx: exp.vwx ?? defaults.vwx }
      : {
          painelRealidade: exp.painelRealidade,
          muralVozes: exp.muralVozes,
          guiaInstitucional: exp.guiaInstitucional,
        }),
  };
}
