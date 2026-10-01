// Strapi is deployed independently of the BFF/shared ESM package. Keep this
// persistence invariant aligned with experience.service.ts and ADR-037/058.
const professional = [
  'contexto',
  'briefing',
  'exploracao',
  'pratica',
  'entregavel',
  'debrief',
  'reflexao',
];
const institutional = [
  ['boas_vindas'],
  ['realidade'],
  ['ano_fase', 'curriculo'],
  ['depoimentos'],
  ['infraestrutura'],
  ['proximos_passos'],
];
const common = ['materiais', 'faq', 'personalizado'];
function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function text(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}
function hasContent(value: unknown): boolean {
  const item = record(value);
  return (
    text(item.conteudo) ||
    text(item.mediaUrl) ||
    text(item.arquivoUrl) ||
    text(record(item.cta).url)
  );
}

export function validateExperiencePublication(data: Record<string, unknown>): void {
  // Archiving must also withdraw a live version when its working draft is incomplete.
  if (data.estado === 'archived') return;
  if (!['review', 'approved', 'published'].includes(String(data.estado)) && !data.publishedAt)
    return;
  const vwx = data.tipoExperiencia === 'vwx';
  const sections = Array.isArray(data.secoes) ? data.secoes.map(record) : [];
  const missing: string[] = [];
  if (!text(data.titulo) || !text(data.descricao)) missing.push('título e descrição');
  if (sections.length || vwx) {
    const groups = vwx ? professional.map((type) => [type]) : institutional;
    for (const group of groups) {
      if (
        !sections.some(
          (section) =>
            group.includes(String(section.tipo)) &&
            Array.isArray(section.itens) &&
            section.itens.some(hasContent)
        )
      )
        missing.push(group.join(' / '));
    }
    if (
      sections.some(
        (section) =>
          !common.includes(String(section.tipo)) &&
          professional.includes(String(section.tipo)) !== vwx
      )
    )
      missing.push('secções incompatíveis com o tipo');
  } else {
    // Published legacy records remain valid during the migration in ADR-037.
    if (!data.painelRealidade) missing.push('painelRealidade');
    if (!Array.isArray(data.muralVozes) || data.muralVozes.length < 3)
      missing.push('muralVozes (mínimo 3 depoimentos)');
    if (!data.guiaInstitucional) missing.push('guiaInstitucional');
  }
  if (vwx) {
    const context = record(data.vwx);
    if (!text(context.profissao) || !text(context.entidade) || !text(context.objetivo))
      missing.push('profissão, entidade e objetivo');
    if (data.painelRealidade || data.muralVozes || data.guiaInstitucional)
      missing.push('VWX não aceita painéis institucionais');
    if (
      (data.publishedAt || data.estado === 'published') &&
      !text(record(data.vwxValidacao).referencia)
    )
      missing.push('validação do parceiro');
  } else if (data.vwx) missing.push('dados profissionais exclusivos de VWX');
  if (missing.length) throw new Error(`Experiência bloqueada: ${missing.join(', ')}`);
}
