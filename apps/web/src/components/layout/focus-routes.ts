export const FOCUS_MODE_ROUTES = [
  /^\/app\/(?:mentor|instituicao)\/cursos\/(?:criar|[^/]+\/editar)\/?$/,
  /^\/app\/(?:mentor|instituicao)\/simulacoes\/(?:criar|[^/]+\/editar|editar\/[^/]+)\/?$/,
  /^\/app\/instituicao\/(?:criar-experiencia|editar-experiencia\/[^/]+)\/?$/,
  /^\/app\/instituicao\/(?:criar-programa|editar-programa\/[^/]+)\/?$/,
  /^\/app\/projetos\/(?:novo|[^/]+\/editar)\/?$/,
  /^\/app\/cursos\/[^/]+\/itens\/[^/]+\/?$/,
  /^\/app\/experiencias\/[^/]+\/?$/,
  /^\/app\/simulacoes\/[^/]+\/play\/?$/,
];

export function isFocusMode(pathname: string): boolean {
  return FOCUS_MODE_ROUTES.some((pattern) => pattern.test(pathname));
}

const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/app\/(?:mentor|instituicao)\/cursos\/criar\/?$/, 'Criar curso'],
  [/^\/app\/(?:mentor|instituicao)\/cursos\/[^/]+\/editar\/?$/, 'Editar curso'],
  [/^\/app\/(?:mentor|instituicao)\/simulacoes\/criar\/?$/, 'Criar simulação'],
  [/^\/app\/(?:mentor|instituicao)\/simulacoes\/(?:[^/]+\/editar|editar\/[^/]+)\/?$/, 'Editar simulação'],
  [/^\/app\/instituicao\/criar-experiencia\/?$/, 'Criar experiência'],
  [/^\/app\/instituicao\/editar-experiencia\/[^/]+\/?$/, 'Editar experiência'],
  [/^\/app\/instituicao\/criar-programa\/?$/, 'Criar programa'],
  [/^\/app\/instituicao\/editar-programa\/[^/]+\/?$/, 'Editar programa'],
  [/^\/app\/projetos\/novo\/?$/, 'Criar projeto'],
  [/^\/app\/projetos\/[^/]+\/editar\/?$/, 'Editar projeto'],
  [/^\/app\/cursos\/[^/]+\/itens\/[^/]+\/?$/, 'Conteúdo do curso'],
  [/^\/app\/experiencias\/[^/]+\/?$/, 'Experiência'],
  [/^\/app\/simulacoes\/[^/]+\/play\/?$/, 'Simulação'],
];

export function getFocusRouteTitle(pathname: string): string {
  return ROUTE_TITLES.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'Modo de foco';
}
