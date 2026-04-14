/**
 * Seed test accounts for Playwright E2E suite.
 *
 * Creates one account per role using the BFF /auth/register/* endpoints.
 * Idempotent — duplicate accounts are silently ignored.
 *
 * Requires: DEV_SKIP_OTP=true, API_URL pointing to the running BFF.
 */

const API_URL = process.env['API_URL'] ?? 'http://localhost:3001';

interface TestAccount {
  email: string;
  password: string;
  nome: string;
  role: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  { email: 'aluno@traycer.test',        password: 'password123', nome: 'Aluno Teste',       role: 'aluno' },
  { email: 'mentor@traycer.test',       password: 'password123', nome: 'Mentor Teste',      role: 'mentor' },
  { email: 'instituicao@traycer.test',  password: 'password123', nome: 'Instituicao Teste', role: 'instituicao' },
  { email: 'moderador@traycer.test',    password: 'password123', nome: 'Moderador Teste',   role: 'moderador' },
  { email: 'super_admin@traycer.test',  password: 'password123', nome: 'Admin Teste',       role: 'super_admin' },
];

function buildRegistrationRequest(account: TestAccount): { url: string; body: Record<string, unknown> } {
  const base = { email: account.email, password: account.password };

  switch (account.role) {
    case 'mentor':
      return {
        url: `${API_URL}/auth/register/mentor`,
        body: { ...base, nome: account.nome, areaEspecialidade: 'Engenharia de Software' },
      };
    case 'instituicao':
      return {
        url: `${API_URL}/auth/register/instituicao`,
        body: { ...base, nomeInstituicao: account.nome, regiao: 'Lisboa', tipo: 'Universidade' },
      };
    // aluno, moderador, super_admin all register as estudante
    // (moderador/super_admin roles must be promoted via Strapi admin after seeding)
    default:
      return {
        url: `${API_URL}/auth/register/estudante`,
        body: { ...base, nome: account.nome, areaInteresse: 'Tecnologia', nivelEnsino: 'Secundário' },
      };
  }
}

async function tryRegister(account: TestAccount): Promise<void> {
  const { url, body } = buildRegistrationRequest(account);

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res.ok || res.status === 409) {
    // 201 = created, 409 = already exists — both are fine
    return;
  }

  const text = await res.text();
  throw new Error(`Failed to seed ${account.email} (HTTP ${res.status}): ${text}`);
}

async function verifyLoginWorks(account: TestAccount): Promise<void> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login verification failed for ${account.email} (HTTP ${res.status}): ${body}`);
  }
}

async function main() {
  console.log(`[seed] Seeding ${TEST_ACCOUNTS.length} test accounts against ${API_URL}`);

  if (process.env['DEV_SKIP_OTP'] !== 'true') {
    console.warn('[seed] WARNING: DEV_SKIP_OTP is not set to "true" — OTP verification will be required during login');
  }

  const errors: string[] = [];

  for (const account of TEST_ACCOUNTS) {
    try {
      await tryRegister(account);
      await verifyLoginWorks(account);
      console.log(`[seed] ✓ ${account.email} (${account.role})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[seed] ✗ ${account.email}: ${message}`);
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
