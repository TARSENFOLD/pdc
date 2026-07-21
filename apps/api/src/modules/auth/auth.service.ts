import { randomUUID } from 'node:crypto';
import { ConsentStateSchema, DomainEventName, resolveEstadoMenoridade, type User, type Role } from '@pdc/shared';
import { strapiDelete, strapiDeleteRaw, strapiGetRaw, strapiPostRaw, strapiGet, strapiPost, strapiPut } from '../strapi/strapi.client.js';
import { getReputacao, getTier } from '../reputation/reputation.service.js';
import { resolvePerfilAvatar } from '../perfil/perfil-media.js';
import { buildPerfilComplianceFields, type RegistrationComplianceInput } from './auth.compliance.js';
import { consentService } from '../consent/consent.service.js';
import { eventBus } from '../events/event-bus.js';
import {
  resolveRole,
  type StrapiPerfilData,
  type StrapiUser,
  type StrapiUsersPermissionsRolesResponse,
} from './auth.strapi-types.js';
import pino from 'pino';
import { DuplicateEmailError } from './auth.errors.js';

const log = pino({ name: 'auth-service' });

async function getAuthenticatedRoleId(): Promise<number | string> {
  const roles = await strapiGetRaw<StrapiUsersPermissionsRolesResponse>('/users-permissions/roles');
  const authenticatedRole = roles.roles.find((role) => role.type === 'authenticated');
  if (!authenticatedRole) {
    throw new Error('Strapi Authenticated role not found');
  }
  return authenticatedRole.id;
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const data = await strapiPostRaw<{ user: StrapiUser }>('/auth/local', {
      identifier: normalizedEmail,
      password,
    });
    return this.getUserById(data.user.id.toString());
  },

  async register(
    email: string,
    password: string,
    nome: string,
    compliance: RegistrationComplianceInput,
  ): Promise<User> {
    return this.registerWithRole(email, password, nome, 'estudante', {}, compliance);
  },

  async registerWithRole(
    email: string,
    password: string,
    nome: string,
    role: Role,
    extra: Record<string, unknown>,
    compliance?: RegistrationComplianceInput,
  ): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUsers = await strapiGetRaw<StrapiUser[]>('/users', {
      'filters[email][$eq]': normalizedEmail,
      'pagination[pageSize]': '1',
    });
    if (existingUsers[0]) {
      throw new DuplicateEmailError();
    }

    let userId: string | undefined;
    try {
      const data = await strapiPostRaw<{ user: StrapiUser }>('/auth/local/register', {
        email: normalizedEmail,
        password,
        username: normalizedEmail,
      });
      userId = data.user.id.toString();

      const perfil = await strapiPost<StrapiPerfilData>('/perfis', {
        userId,
        nome,
        tipo: role,
        email: normalizedEmail,
        ativo: true,
        ...extra,
        ...buildPerfilComplianceFields(compliance),
      });
      if (compliance?.aceiteLegal) {
        await consentService.recordLegalAcceptance({
          userId,
          perfilId: perfil.data.id,
          ...(perfil.data.documentId ? { perfilDocumentId: perfil.data.documentId } : {}),
          actorRole: role,
          aceiteLegal: compliance.aceiteLegal,
          source: compliance.source,
          ...(compliance.dataNascimento ? { dataNascimento: compliance.dataNascimento } : {}),
          ...(compliance.consentimentoEncarregado ? { consentimentoEncarregado: compliance.consentimentoEncarregado } : {}),
        });
      }

      const user = await this.getUserById(userId);
      try {
        await eventBus.publishWithOutbox(DomainEventName.PERFIL_CRIADO, {
          perfilId: String(perfil.data.id),
          role,
        });
      } catch (eventError) {
        log.error({ eventError, userId }, 'Falha ao publicar PERFIL_CRIADO; registo mantém-se válido');
      }
      return user;
    } catch (err) {
      if (userId) try { await this.rollbackRegistration(userId); } catch (rollbackError) { log.error({ rollbackError, userId }, 'Falha na compensação do registo'); }
      throw err;
    }
  },

  async rollbackRegistration(userId: string): Promise<void> {
    const perfis = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': userId,
      'populate[instituicaoGerida][fields][0]': 'id',
      'populate[instituicaoGerida][fields][1]': 'documentId',
      'pagination[pageSize]': '1',
    });
    const perfil = perfis.data[0];
    const errors: unknown[] = [];
    if (perfil?.instituicaoGerida) {
      try {
        await strapiDelete(`/instituicoes/${perfil.instituicaoGerida.documentId ?? String(perfil.instituicaoGerida.id)}`);
      } catch (error) {
        errors.push(error);
        log.error({ error, userId }, 'Falha ao remover instituição durante rollback');
      }
    }
    if (perfil?.id !== undefined) {
      try {
        await strapiDelete(`/perfis/${perfil.documentId ?? String(perfil.id)}`);
      } catch (error) {
        errors.push(error);
        log.error({ error, userId }, 'Falha ao remover perfil durante rollback');
      }
    }
    try {
      await strapiDeleteRaw(`/users/${userId}`);
    } catch (error) {
      errors.push(error);
      log.error({ error, userId }, 'Falha ao remover utilizador durante rollback');
    }
    if (errors.length > 0) throw new AggregateError(errors, 'Rollback de registo incompleto');
  },

  async getUserById(id: string): Promise<User> {
    const user = await strapiGetRaw<StrapiUser>(`/users/${id}`, { populate: 'role' });

    const resPerfil = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': id,
      'populate': ['foto', 'capa', 'conquistas'],
    });

    const perfilData = resPerfil.data[0] ?? null;
    const reputationScore = perfilData?.id === undefined
      ? 0
      : await getReputacao(String(perfilData.id));

    return this.mapStrapiUser(user, perfilData, reputationScore);
  },

  async findOrCreateUser(email: string, nome: string): Promise<User> {
    const normalizedEmail = email.toLowerCase().trim();
    const users = await strapiGetRaw<StrapiUser[]>('/users', {
      'filters[email][$eq]': normalizedEmail,
      'populate': 'role',
    });

    if (users[0]) {
      if (users[0].confirmed === false) {
        throw Object.assign(
          new Error('Conta com este email existe mas não está verificada. Use email/password para iniciar sessão.'),
          { status: 403 }
        );
      }
      return this.getUserById(users[0].id.toString());
    }

    const newUser = await strapiPostRaw<StrapiUser>('/users', {
      email: normalizedEmail,
      username: normalizedEmail,
      password: randomUUID(),
      role: await getAuthenticatedRoleId(),
      confirmed: true,
    });
    const userId = newUser.id.toString();

    const perfil = await strapiPost('/perfis', {
      userId,
      nome,
      tipo: 'estudante',
      email: normalizedEmail,
      ativo: true,
      onboardingCompleto: false,
      ...buildPerfilComplianceFields({ source: 'oauth' }),
    });

    const user = await this.getUserById(userId);
    await eventBus.publishWithOutbox(DomainEventName.PERFIL_CRIADO, {
      perfilId: String(perfil.data.id),
      role: 'estudante',
    });
    return user;
  },

  async setOauthProvider(userId: string, provider: 'google' | 'linkedin'): Promise<void> {
    const res = await strapiGet<StrapiPerfilData>('/perfis', {
      'filters[userId][$eq]': userId,
    });
    const perfil = res.data[0];
    if (!perfil?.id) {
      log.warn({ userId, provider }, 'Cannot set OAuth provider: perfil not found');
      return;
    }
    if (!perfil.oauthProvider) {
      const perfilId = perfil.documentId ?? String(perfil.id);
      await strapiPut(`/perfis/${perfilId}`, { oauthProvider: provider });
      await eventBus.publishWithOutbox(DomainEventName.OAUTH_VINCULADO, {
        userId,
        provider,
      });
    }
  },

  mapStrapiUser(u: StrapiUser, perfil: StrapiPerfilData | null, reputationScore = 0): User {
    const oauthProvider = perfil?.oauthProvider;
    const consentsResult = ConsentStateSchema.safeParse(perfil?.consents);
    const estadoMenoridade = perfil?.estadoMenoridade ?? resolveEstadoMenoridade(perfil?.dataNascimento ?? undefined);
    return {
      id: u.id.toString(),
      email: u.email,
      nome: perfil?.nome ?? u.nome ?? u.username,
      role: resolveRole(u.role?.name, perfil?.tipo),
      perfilId: perfil?.id === undefined ? undefined : String(perfil.id),
      avatarUrl: resolvePerfilAvatar(perfil?.avatarUrl, perfil?.foto, u.avatar?.url),
      bannerUrl: perfil?.bannerUrl ?? undefined,
      reputacaoTier: getTier(reputationScore),
      xp: 0,
      reputacao: reputationScore,
      createdAt: u.createdAt ?? new Date().toISOString(),
      updatedAt: u.updatedAt ?? new Date().toISOString(),
      bio: perfil?.bio ?? undefined,
      areasInteresse: perfil?.areasInteresse ?? [],
      conquistas: perfil?.conquistas ?? [],
      aprovado: perfil?.aprovado ?? undefined,
      oauthVerified: perfil?.oauthVerified ?? undefined,
      oauthProvider: oauthProvider === 'google' || oauthProvider === 'linkedin' ? oauthProvider : undefined,
      onboardingCompleto: perfil?.onboardingCompleto ?? undefined,
      isMinor: estadoMenoridade === 'menor',
      estadoMenoridade,
      consentimentoEstado: perfil?.consentimentoEstado ?? undefined,
      consents: consentsResult.success ? consentsResult.data : {},
    };
  },
};
