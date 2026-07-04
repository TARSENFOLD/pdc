import { z } from 'zod';
import { authService } from '../modules/auth/auth.service.js';
import {
  resetInternalAccountPassword,
  setCanonicalUserRole,
} from '../modules/auth/internal-account.service.js';
import { strapiGetRaw, strapiPostRaw } from '../modules/strapi/strapi.client.js';
import { env } from '../lib/env.js';

const ProvisionInputSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(12),
  name: z.string().trim().min(3),
  role: z.enum(['super_admin', 'moderador', 'comite_cientifico']),
  resetPassword: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});

interface StrapiUser {
  id: string | number;
  email: string;
}

interface StrapiRole {
  id: string | number;
  type: string;
}

async function authenticatedRoleId(): Promise<string | number> {
  const response = await strapiGetRaw<{ roles: StrapiRole[] }>('/users-permissions/roles');
  const role = response.roles.find((candidate) => candidate.type === 'authenticated');
  if (!role) throw new Error('Role Authenticated não encontrada no Strapi');
  return role.id;
}

async function main(): Promise<void> {
  const input = ProvisionInputSchema.parse({
    email: env.PDC_INTERNAL_ACCOUNT_EMAIL,
    password: env.PDC_INTERNAL_ACCOUNT_PASSWORD,
    name: env.PDC_INTERNAL_ACCOUNT_NAME,
    role: env.PDC_INTERNAL_ACCOUNT_ROLE,
    resetPassword: env.PDC_INTERNAL_ACCOUNT_RESET_PASSWORD,
  });

  const users = await strapiGetRaw<StrapiUser[]>('/users', {
    'filters[email][$eq]': input.email,
    'pagination[pageSize]': '1',
  });
  let user = users[0];

  if (!user) {
    user = await strapiPostRaw<StrapiUser>('/users', {
      email: input.email,
      username: input.email,
      password: input.password,
      role: await authenticatedRoleId(),
      confirmed: true,
      blocked: false,
    });
  } else if (input.resetPassword) {
    await resetInternalAccountPassword(String(user.id), input.password);
  }

  await setCanonicalUserRole(String(user.id), input.role);
  const verified = await authService.getUserById(String(user.id));
  if (verified.role !== input.role) {
    throw new Error(`Falha ao provisionar role: esperado ${input.role}, recebido ${verified.role}`);
  }

  process.stdout.write(`Conta interna pronta: ${verified.email} (${verified.role})\n`);
  if (users[0] && !input.resetPassword) {
    process.stdout.write('A palavra-passe existente foi preservada.\n');
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Falha ao provisionar conta interna: ${message}`);
  process.exitCode = 1;
});
