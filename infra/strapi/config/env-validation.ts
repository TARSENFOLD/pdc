const PLACEHOLDER_RE = /<[^>]+>/;

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

function isMissingOrPlaceholder(value: string | undefined): boolean {
  return typeof value !== 'string' || value.trim().length === 0 || PLACEHOLDER_RE.test(value.trim());
}

function isMissingOrEmpty(value: string | undefined): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function requireProductionEnv(keys: string[]): void {
  if (!isProduction()) return;

  const missing = keys.filter((key) => isMissingOrPlaceholder(process.env[key]));
  if (missing.length > 0) {
    throw new Error(`Configuração Strapi de produção incompleta: ${missing.join(', ')}`);
  }
}

export function requireProductionCsvEnv(key: string, minItems: number): void {
  if (!isProduction()) return;

  const value = process.env[key];
  if (isMissingOrEmpty(value)) {
    throw new Error(`Configuração Strapi de produção incompleta: ${key}`);
  }

  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  const hasDuplicates = new Set(entries).size !== entries.length;
  if (entries.length < minItems || hasDuplicates || entries.some((entry) => PLACEHOLDER_RE.test(entry))) {
    throw new Error(`Configuração Strapi de produção incompleta: ${key} requer ${minItems.toString()} valores reais distintos`);
  }
}
