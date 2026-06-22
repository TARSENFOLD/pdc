import { config as loadEnv } from 'dotenv';
import { E2E_PERFIL_COMPLIANCE } from './compliance.js';

loadEnv({ path: 'apps/api/.env' });

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';
const STRAPI_URL = process.env['STRAPI_URL'] ?? 'http://localhost:1337';
const STRAPI_API_TOKEN = process.env['STRAPI_API_TOKEN'];

type SeedRole =
  | 'estudante'
  | 'mentor'
  | 'instituicao'
  | 'moderador'
  | 'comite_cientifico'
  | 'super_admin';

interface TestAccount {
  email: string;
  password: string;
  nome: string;
  role: SeedRole;
}

interface BffUser {
  id: string | number;
  email: string;
  role: SeedRole;
}

interface StrapiUser {
  id: string | number;
  email: string;
  username?: string;
}

interface StrapiEntity<T> {
  id: string | number;
  documentId?: string;
  attributes?: T;
}

interface StrapiListResponse<T> {
  data?: Array<StrapiEntity<T> & T>;
}

interface PerfilData {
  userId: string;
  email: string;
  nome: string;
  tipo: SeedRole;
  ativo: boolean;
  dataNascimento: string;
  estadoMenoridade: typeof E2E_PERFIL_COMPLIANCE.estadoMenoridade;
  consentimentoEstado: typeof E2E_PERFIL_COMPLIANCE.consentimentoEstado;
}

const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'aluno@traycer.test', password: 'password123', nome: 'Aluno Teste', role: 'estudante' },
  { email: 'estudante@traycer.test', password: 'password123', nome: 'Estudante Teste', role: 'estudante' },
  { email: 'mentor@traycer.test', password: 'password123', nome: 'Mentor Teste', role: 'mentor' },
  { email: 'instituicao@traycer.test', password: 'password123', nome: 'Instituicao Teste', role: 'instituicao' },
  { email: 'moderador@traycer.test', password: 'password123', nome: 'Moderador Teste', role: 'moderador' },
  { email: 'comite_cientifico@traycer.test', password: 'password123', nome: 'Comite Cientifico Teste', role: 'comite_cientifico' },
  { email: 'super_admin@traycer.test', password: 'password123', nome: 'Admin Teste', role: 'super_admin' },
];

function requireStrapiToken(): string {
  if (!STRAPI_API_TOKEN) {
    throw new Error('STRAPI_API_TOKEN is required to seed canonical Perfil records');
  }
  return STRAPI_API_TOKEN;
}

async function isBffReachable(): Promise<boolean> {
  try {
    await fetch(`${API_URL}/bootstrap`, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

async function bffLogin(account: Pick<TestAccount, 'email' | 'password'>): Promise<BffUser | null> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: account.password }),
    });

    if (res.status === 401 || res.status === 400) return null;
    if (!res.ok) return null;
    return (await res.json()) as BffUser;
  } catch {
    return null;
  }
}

async function strapiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${requireStrapiToken()}`);

  const res = await fetch(`${STRAPI_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi ${init.method ?? 'GET'} ${path} failed (HTTP ${res.status}): ${body}`);
  }

  return (await res.json()) as T;
}

async function findStrapiUserByEmail(email: string): Promise<StrapiUser | null> {
  try {
    const users = await strapiFetch<StrapiUser[]>(`/api/users?filters[email][$eq]=${encodeURIComponent(email)}&pagination[pageSize]=1`);
    return Array.isArray(users) ? (users[0] ?? null) : null;
  } catch {
    return null;
  }
}

async function registerStrapiUser(account: TestAccount): Promise<StrapiUser> {
  const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: account.email,
      username: account.email,
      password: account.password,
    }),
  });

  if (res.status === 400) {
    const existing = await findStrapiUserByEmail(account.email);
    if (existing) return existing;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi register failed for ${account.email} (HTTP ${res.status}): ${body}`);
  }

  const data = (await res.json()) as { user: StrapiUser };
  return data.user;
}

function perfilPayload(account: TestAccount, userId: string): PerfilData & Record<string, unknown> {
  const base: PerfilData = {
    userId,
    email: account.email,
    nome: account.nome,
    tipo: account.role,
    ativo: true,
    dataNascimento: E2E_PERFIL_COMPLIANCE.dataNascimento,
    estadoMenoridade: E2E_PERFIL_COMPLIANCE.estadoMenoridade,
    consentimentoEstado: E2E_PERFIL_COMPLIANCE.consentimentoEstado,
  };

  switch (account.role) {
    case 'mentor':
      return {
        ...base,
        ...E2E_PERFIL_COMPLIANCE,
        areaFormacao: 'TECNOLOGIA',
        areasInteresse: ['TECNOLOGIA', 'ENGENHARIA'],
        aprovado: true,
      };
    case 'instituicao':
      return {
        ...base,
        ...E2E_PERFIL_COMPLIANCE,
        regiao: 'Luanda',
        tipoInstituicao: 'universidade',
        aprovado: true,
      };
    case 'moderador':
      return { ...base, ...E2E_PERFIL_COMPLIANCE, funcao: 'Moderacao' };
    case 'comite_cientifico':
      return { ...base, ...E2E_PERFIL_COMPLIANCE, funcao: 'Validacao Cientifica' };
    case 'super_admin':
      return { ...base, ...E2E_PERFIL_COMPLIANCE, funcao: 'Operacao Interna' };
    case 'estudante':
      return {
        ...base,
        ...E2E_PERFIL_COMPLIANCE,
        areasInteresse: ['TECNOLOGIA'],
        nivelEnsino: 'Licenciatura',
      };
  }
}

async function findPerfil(account: TestAccount, userId: string): Promise<(StrapiEntity<PerfilData> & PerfilData) | null> {
  const query = new URLSearchParams({
    'filters[userId][$eq]': userId,
    'pagination[pageSize]': '1',
  });
  const res = await strapiFetch<StrapiListResponse<PerfilData>>(`/api/perfis?${query.toString()}`);
  return res.data?.[0] ?? null;
}

async function upsertPerfil(account: TestAccount, userId: string): Promise<void> {
  const existing = await findPerfil(account, userId);
  const payload = perfilPayload(account, userId);

  if (!existing) {
    await strapiFetch('/api/perfis', {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
    });
    return;
  }

  await strapiFetch(`/api/perfis/${existing.documentId ?? existing.id}`, {
    method: 'PUT',
    body: JSON.stringify({ data: payload }),
  });
}

async function ensureAccount(account: TestAccount, bffAvailable: boolean): Promise<void> {
  let userId: string;

  if (bffAvailable) {
    const user = await bffLogin(account);
    if (user) {
      userId = String(user.id);
    } else {
      const strapiUser = await registerStrapiUser(account);
      userId = String(strapiUser.id);
    }
  } else {
    const existing = await findStrapiUserByEmail(account.email);
    if (existing) {
      userId = String(existing.id);
    } else {
      const strapiUser = await registerStrapiUser(account);
      userId = String(strapiUser.id);
    }
  }

  await upsertPerfil(account, userId);

  if (bffAvailable) {
    const verified = await bffLogin(account);
    if (!verified) {
      throw new Error(`Login verification failed for ${account.email}`);
    }
    if (verified.role !== account.role) {
      throw new Error(`Role mismatch for ${account.email}: expected ${account.role}, got ${verified.role}`);
    }
  } else {
    console.log(`[seed] BFF not available — skipping role verification for ${account.email}`);
  }
}

async function main() {
  const bffAvailable = await isBffReachable();
  if (!bffAvailable) {
    console.log(`[seed] BFF not reachable at ${API_URL} — Strapi-only mode (skipping role verification)`);
  }
  console.log(`[seed] Seeding ${TEST_ACCOUNTS.length} test accounts against ${STRAPI_URL}`);

  if (process.env['DEV_SKIP_OTP'] !== 'true') {
    console.warn('[seed] WARNING: DEV_SKIP_OTP is not set to "true" — OTP verification will be required during login');
  }

  const errors: string[] = [];

  for (const account of TEST_ACCOUNTS) {
    try {
      await ensureAccount(account, bffAvailable);
      console.log(`[seed] OK ${account.email} (${account.role})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[seed] FAIL ${account.email}: ${message}`);
      errors.push(message);
    }
  }

  if (errors.length > 0) {
    console.error(`[seed] ${errors.length} account(s) failed to seed.`);
    process.exit(1);
  }

  console.log('[seed] All test accounts ready.');
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
