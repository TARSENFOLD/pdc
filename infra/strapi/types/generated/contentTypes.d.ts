import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminAuditLog extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_audit_logs';
  info: {
    displayName: 'Audit Log';
    pluralName: 'audit-logs';
    singularName: 'audit-log';
  };
  options: {
    draftAndPublish: false;
    timestamps: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    date: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::audit-log'> &
      Schema.Attribute.Private;
    payload: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<'oneToOne', 'admin::user'>;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAuditLogAuditLog extends Struct.CollectionTypeSchema {
  collectionName: 'audit_logs';
  info: {
    displayName: 'Log de Auditoria';
    pluralName: 'audit-logs';
    singularName: 'audit-log';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acao: Schema.Attribute.String & Schema.Attribute.Required;
    actorId: Schema.Attribute.String;
    actorRole: Schema.Attribute.String;
    alvoId: Schema.Attribute.String;
    alvoTipo: Schema.Attribute.String;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    detalhes: Schema.Attribute.JSON;
    ipHash: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::audit-log.audit-log'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    serverTimestamp: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userAgent: Schema.Attribute.String;
  };
}

export interface ApiBehaviorPatternBehaviorPattern
  extends Struct.CollectionTypeSchema {
  collectionName: 'behavior_patterns';
  info: {
    description: 'Motor de heur\u00EDsticas e padr\u00F5es comportamentais por dom\u00EDnio t\u00E9cnico';
    displayName: 'Behavior Pattern';
    pluralName: 'behavior-patterns';
    singularName: 'behavior-pattern';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    cognitiveFluidity: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    decisionSpeedAvg: Schema.Attribute.Integer;
    domainId: Schema.Attribute.String & Schema.Attribute.Required;
    focusStability: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 0;
        },
        number
      >;
    hesitationIndex: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 0;
        },
        number
      >;
    lastUpdatedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::behavior-pattern.behavior-pattern'
    > &
      Schema.Attribute.Private;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    publishedAt: Schema.Attribute.DateTime;
    resilienceIndex: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 0;
        },
        number
      >;
    successRate: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 1;
          min: 0;
        },
        number
      >;
    technicalScore: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 0;
        },
        number
      >;
    tinaSummary: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiBookmarkBookmark extends Struct.CollectionTypeSchema {
  collectionName: 'bookmarks';
  info: {
    displayName: 'Bookmark';
    pluralName: 'bookmarks';
    singularName: 'bookmark';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['actor', 'targetType', 'targetId'];
        name: 'unique_bookmark_actor_target';
        type: 'unique';
      },
    ];
  };
  attributes: {
    actor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    colecao: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::bookmark.bookmark'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCertificadoCertificado extends Struct.CollectionTypeSchema {
  collectionName: 'certificados';
  info: {
    displayName: 'Certificado';
    pluralName: 'certificados';
    singularName: 'certificado';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    aluno: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    codigoValidacao: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    curso: Schema.Attribute.Relation<'manyToOne', 'api::curso.curso'> &
      Schema.Attribute.Required;
    emitidoEm: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::certificado.certificado'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    urlArquivo: Schema.Attribute.String;
  };
}

export interface ApiCommentComment extends Struct.CollectionTypeSchema {
  collectionName: 'comments';
  info: {
    displayName: 'Comment';
    pluralName: 'comments';
    singularName: 'comment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    conteudo: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    editadoEm: Schema.Attribute.DateTime;
    estado: Schema.Attribute.Enumeration<['ativo', 'removido', 'moderado']> &
      Schema.Attribute.DefaultTo<'ativo'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::comment.comment'
    > &
      Schema.Attribute.Private;
    parentId: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiConquistaUtilizadorConquistaUtilizador
  extends Struct.CollectionTypeSchema {
  collectionName: 'conquista_utilizadores';
  info: {
    displayName: 'Conquista do Utilizador';
    pluralName: 'conquista-utilizadores';
    singularName: 'conquista-utilizador';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    conquista: Schema.Attribute.Relation<
      'manyToOne',
      'api::conquista.conquista'
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    desbloqueadaEm: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::conquista-utilizador.conquista-utilizador'
    > &
      Schema.Attribute.Private;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiConquistaConquista extends Struct.CollectionTypeSchema {
  collectionName: 'conquistas';
  info: {
    displayName: 'Conquista';
    pluralName: 'conquistas';
    singularName: 'conquista';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    aprovada: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    categoria: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    data: Schema.Attribute.DateTime;
    descricao: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::conquista.conquista'
    > &
      Schema.Attribute.Private;
    midias: Schema.Attribute.Media<'images' | 'files' | 'videos', true>;
    origem: Schema.Attribute.Enumeration<['auto', 'manual']> &
      Schema.Attribute.DefaultTo<'auto'>;
    perfis: Schema.Attribute.Relation<'manyToMany', 'api::perfil.perfil'>;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Unique;
    tags: Schema.Attribute.JSON;
    tipo: Schema.Attribute.Enumeration<
      ['automatica', 'manual', 'institucional', 'plataforma']
    >;
    tipoAutor: Schema.Attribute.Enumeration<
      ['mentor', 'instituicao', 'plataforma', 'aluno']
    >;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    validadoAcademicamente: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface ApiConsentimentoConsentimento
  extends Struct.CollectionTypeSchema {
  collectionName: 'consentimentos';
  info: {
    description: 'Registo audit\u00E1vel de consentimentos legais, privacidade e menoridade';
    displayName: 'Consentimento';
    pluralName: 'consentimentos';
    singularName: 'consentimento';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acceptedAt: Schema.Attribute.DateTime;
    actorRole: Schema.Attribute.String;
    concedido: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    documentoLegal: Schema.Attribute.Relation<
      'manyToOne',
      'api::documento-legal.documento-legal'
    >;
    documentVersion: Schema.Attribute.String;
    encarregadoEmail: Schema.Attribute.Email;
    encarregadoNome: Schema.Attribute.String;
    estado: Schema.Attribute.Enumeration<
      ['pendente', 'aceite', 'recusado', 'revogado']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pendente'>;
    finalidade: Schema.Attribute.Enumeration<
      [
        'termos_uso',
        'politica_privacidade',
        'tratamento_dados',
        'cookies_analiticos',
        'transparencia_ia',
        'partilha_institucional',
        'encarregado_educacao',
      ]
    > &
      Schema.Attribute.Required;
    ipHash: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::consentimento.consentimento'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    publishedAt: Schema.Attribute.DateTime;
    revokedAt: Schema.Attribute.DateTime;
    serverTimestamp: Schema.Attribute.DateTime;
    source: Schema.Attribute.Enumeration<
      [
        'registo_email',
        'oauth',
        'admin',
        'importacao_institucional',
        'reconsentimento',
      ]
    > &
      Schema.Attribute.DefaultTo<'registo_email'>;
    tipo: Schema.Attribute.Enumeration<
      [
        'termos',
        'privacidade',
        'perfil_vocacional',
        'marketing',
        'partilha_instituicao',
      ]
    >;
    titularMenor: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userAgent: Schema.Attribute.String;
    userId: Schema.Attribute.String & Schema.Attribute.Required;
    versao: Schema.Attribute.String;
  };
}

export interface ApiConversaConversa extends Struct.CollectionTypeSchema {
  collectionName: 'conversas';
  info: {
    displayName: 'Conversa';
    pluralName: 'conversas';
    singularName: 'conversa';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['participantsKey'];
        name: 'unique_conversa_participantes';
        type: 'unique';
      },
      {
        columns: ['participant1'];
        name: 'idx_conversa_participant1';
      },
      {
        columns: ['participant2'];
        name: 'idx_conversa_participant2';
      },
    ];
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::conversa.conversa'
    > &
      Schema.Attribute.Private;
    participant1: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    participant2: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    participantsKey: Schema.Attribute.String & Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    ultimaMensagem: Schema.Attribute.Relation<
      'oneToOne',
      'api::mensagem.mensagem'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCursoCurso extends Struct.CollectionTypeSchema {
  collectionName: 'cursos';
  info: {
    description: 'Cursos vocacionais e t\u00E9cnicos';
    displayName: 'Curso';
    pluralName: 'cursos';
    singularName: 'curso';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    area: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
      ]
    >;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    autorId: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataFim: Schema.Attribute.Date;
    dataInicio: Schema.Attribute.Date;
    descricao: Schema.Attribute.Text;
    duracaoEstimada: Schema.Attribute.Integer;
    estado: Schema.Attribute.Enumeration<
      ['draft', 'review', 'approved', 'published', 'archived']
    > &
      Schema.Attribute.DefaultTo<'draft'>;
    gratuito: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    historicoEstados: Schema.Attribute.JSON;
    idioma: Schema.Attribute.Enumeration<['pt', 'en', 'fr']> &
      Schema.Attribute.DefaultTo<'pt'>;
    instituicao: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    >;
    isDemo: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::curso.curso'> &
      Schema.Attribute.Private;
    moeda: Schema.Attribute.String & Schema.Attribute.DefaultTo<'USD'>;
    motivoRejeicao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    nivel: Schema.Attribute.Enumeration<['basico', 'medio', 'avancado']>;
    nome: Schema.Attribute.String;
    objetivos: Schema.Attribute.Text;
    preco: Schema.Attribute.Decimal;
    publishedAt: Schema.Attribute.DateTime;
    regrasAcesso: Schema.Attribute.JSON;
    rejeitadoEm: Schema.Attribute.DateTime;
    rejeitadoPor: Schema.Attribute.String;
    requisitos: Schema.Attribute.Text;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Unique;
    syllabus: Schema.Attribute.Text;
    tags: Schema.Attribute.JSON;
    thumbnailUrl: Schema.Attribute.String;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    visibilidade: Schema.Attribute.Enumeration<
      ['publico', 'privado', 'institucional']
    > &
      Schema.Attribute.DefaultTo<'publico'>;
  };
}

export interface ApiDenunciaDenuncia extends Struct.CollectionTypeSchema {
  collectionName: 'denuncias';
  info: {
    displayName: 'Den\u00FAncia';
    pluralName: 'denuncias';
    singularName: 'denuncia';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acaoTomada: Schema.Attribute.Enumeration<
      ['nenhuma', 'aviso', 'remocao', 'suspensao']
    >;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    comentarioModerador: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    detalhes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    estado: Schema.Attribute.Enumeration<
      ['pendente', 'em_analise', 'resolvida', 'rejeitada']
    > &
      Schema.Attribute.DefaultTo<'pendente'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::denuncia.denuncia'
    > &
      Schema.Attribute.Private;
    moderador: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    motivo: Schema.Attribute.String & Schema.Attribute.Required;
    prioridade: Schema.Attribute.Enumeration<
      ['baixa', 'media', 'alta', 'critica']
    >;
    publishedAt: Schema.Attribute.DateTime;
    resolvidaEm: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String;
    targetType: Schema.Attribute.String;
    tipo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDocumentoLegalDocumentoLegal
  extends Struct.CollectionTypeSchema {
  collectionName: 'documentos_legais';
  info: {
    description: 'Documento legal versionado para consentimentos e re-aceites';
    displayName: 'Documento Legal';
    pluralName: 'documentos-legais';
    singularName: 'documento-legal';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    consentimentos: Schema.Attribute.Relation<
      'oneToMany',
      'api::consentimento.consentimento'
    >;
    conteudo: Schema.Attribute.RichText & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effectiveAt: Schema.Attribute.DateTime;
    estado: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::documento-legal.documento-legal'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    resumo: Schema.Attribute.Text;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Required;
    tipo: Schema.Attribute.Enumeration<
      [
        'termos_uso',
        'politica_privacidade',
        'tratamento_dados',
        'politica_cookies',
        'transparencia_ia',
        'dpa',
      ]
    > &
      Schema.Attribute.Required;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    versao: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ApiDomainEventDomainEvent extends Struct.CollectionTypeSchema {
  collectionName: 'domain_events';
  info: {
    description: 'Registro do Outbox Pattern para garantia de eventos';
    displayName: 'Domain Event';
    pluralName: 'domain-events';
    singularName: 'domain-event';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attempts: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    correlationId: Schema.Attribute.UID & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    hookResults: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::domain-event.domain-event'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    payload: Schema.Attribute.JSON & Schema.Attribute.Required;
    processed: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    processedAt: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiExperienciaParticipanteExperienciaParticipante
  extends Struct.CollectionTypeSchema {
  collectionName: 'experiencia_participantes';
  info: {
    displayName: 'Experi\u00EAncia Participante';
    pluralName: 'experiencia-participantes';
    singularName: 'experiencia-participante';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    estudanteId: Schema.Attribute.String & Schema.Attribute.Required;
    experiencia: Schema.Attribute.Relation<
      'manyToOne',
      'api::experiencia.experiencia'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::experiencia-participante.experiencia-participante'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiExperienciaExperiencia extends Struct.CollectionTypeSchema {
  collectionName: 'experiencias';
  info: {
    displayName: 'Experi\u00EAncia';
    pluralName: 'experiencias';
    singularName: 'experiencia';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    area: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
      ]
    >;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    curso: Schema.Attribute.Relation<'manyToOne', 'api::curso.curso'>;
    dataFim: Schema.Attribute.DateTime;
    dataInicio: Schema.Attribute.DateTime;
    descricao: Schema.Attribute.Text;
    duracaoEstimada: Schema.Attribute.Integer;
    estado: Schema.Attribute.Enumeration<
      ['draft', 'review', 'approved', 'published', 'archived']
    > &
      Schema.Attribute.DefaultTo<'draft'>;
    gradeDestaque: Schema.Attribute.JSON;
    gratuito: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    guiaInstitucional: Schema.Attribute.JSON;
    instituicao: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    >;
    isDemo: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizacao: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::experiencia.experiencia'
    > &
      Schema.Attribute.Private;
    modalidade: Schema.Attribute.Enumeration<
      ['presencial', 'online', 'hibrido']
    >;
    motivoRejeicao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    muralVozes: Schema.Attribute.JSON;
    nivel: Schema.Attribute.Enumeration<['basico', 'medio', 'avancado']>;
    painelRealidade: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    rejeitadoEm: Schema.Attribute.DateTime;
    rejeitadoPor: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    secoes: Schema.Attribute.JSON;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Unique;
    tags: Schema.Attribute.JSON;
    telemetriaConfig: Schema.Attribute.JSON;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    vagas: Schema.Attribute.Integer;
    validadoAcademicamente: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    visibilidade: Schema.Attribute.Enumeration<
      ['publico', 'privado', 'institucional']
    > &
      Schema.Attribute.DefaultTo<'publico'>;
  };
}

export interface ApiFeatureFlagFeatureFlag extends Struct.CollectionTypeSchema {
  collectionName: 'feature_flags';
  info: {
    displayName: 'Feature Flag';
    pluralName: 'feature-flags';
    singularName: 'feature-flag';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['domain'];
        name: 'unique_feature_flag_domain';
        type: 'unique';
      },
    ];
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    domain: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    enabled: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::feature-flag.feature-flag'
    > &
      Schema.Attribute.Private;
    overrides: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFeedEntryFeedEntry extends Struct.CollectionTypeSchema {
  collectionName: 'feed_entries';
  info: {
    description: 'Entradas agregadas para o feed multi-source';
    displayName: 'Feed Entry';
    pluralName: 'feed-entries';
    singularName: 'feed-entry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    area: Schema.Attribute.String;
    autorId: Schema.Attribute.String;
    corpo: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entityId: Schema.Attribute.String & Schema.Attribute.Required;
    entityType: Schema.Attribute.Enumeration<
      ['curso', 'simulacao', 'experiencia', 'programa', 'projeto', 'post']
    >;
    eventId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::feed-entry.feed-entry'
    > &
      Schema.Attribute.Private;
    publicadoEm: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    score: Schema.Attribute.Float & Schema.Attribute.DefaultTo<0>;
    source: Schema.Attribute.Enumeration<
      ['geral', 'vocacional', 'institucional', 'trending']
    >;
    titulo: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFeedPostFeedPost extends Struct.CollectionTypeSchema {
  collectionName: 'feed-posts';
  info: {
    displayName: 'Feed Post';
    pluralName: 'feed-posts';
    singularName: 'feed-post';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    comentariosCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    corpo: Schema.Attribute.RichText & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    estado: Schema.Attribute.Enumeration<
      ['pendente_moderacao', 'aprovada', 'rejeitada', 'hidden']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pendente_moderacao'>;
    eventId: Schema.Attribute.String & Schema.Attribute.Unique;
    likesCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::feed-post.feed-post'
    > &
      Schema.Attribute.Private;
    mediaUrls: Schema.Attribute.JSON;
    motivoModeracao: Schema.Attribute.Text;
    motivoOcultacao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    motivoRejeicao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    rejeitadoEm: Schema.Attribute.DateTime;
    rejeitadoPor: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiInscricaoProgramaInscricaoPrograma
  extends Struct.CollectionTypeSchema {
  collectionName: 'inscricoes_programas';
  info: {
    displayName: 'Inscri\u00E7\u00E3o em Programa';
    pluralName: 'inscricoes-programas';
    singularName: 'inscricao-programa';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['perfil', 'programa'];
        name: 'unique_inscricao_perfil_programa';
        type: 'unique';
      },
      {
        columns: ['perfil'];
        name: 'idx_inscricao_programa_perfil';
      },
      {
        columns: ['programa'];
        name: 'idx_inscricao_programa_programa';
      },
    ];
  };
  attributes: {
    concluido: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataConclusao: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::inscricao-programa.inscricao-programa'
    > &
      Schema.Attribute.Private;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    programa: Schema.Attribute.Relation<'manyToOne', 'api::programa.programa'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiInscricaoInscricao extends Struct.CollectionTypeSchema {
  collectionName: 'inscricoes';
  info: {
    displayName: 'Inscri\u00E7\u00E3o';
    pluralName: 'inscricoes';
    singularName: 'inscricao';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    concluidoEm: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    curso: Schema.Attribute.Relation<'manyToOne', 'api::curso.curso'> &
      Schema.Attribute.Required;
    dataInscricao: Schema.Attribute.Date;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::inscricao.inscricao'
    > &
      Schema.Attribute.Private;
    modulosConcluidos: Schema.Attribute.JSON;
    pago: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    progressoPercentual: Schema.Attribute.Integer &
      Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Enumeration<['aluno', 'mentor']> &
      Schema.Attribute.DefaultTo<'aluno'>;
    ultimaAtividadeEm: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    valorPago: Schema.Attribute.Decimal;
  };
}

export interface ApiInstituicaoInstituicao extends Struct.CollectionTypeSchema {
  collectionName: 'instituicoes';
  info: {
    description: 'Institui\u00E7\u00F5es B2B e B2C';
    displayName: 'Institui\u00E7\u00E3o';
    pluralName: 'instituicoes';
    singularName: 'instituicao';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    acessibilidade: Schema.Attribute.JSON;
    acreditacoes: Schema.Attribute.Component<'instituicao.acreditacao', true>;
    anoFundacao: Schema.Attribute.Integer;
    aprovada: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    areasAtividade: Schema.Attribute.JSON;
    branding: Schema.Attribute.JSON;
    capa: Schema.Attribute.Media<'images'>;
    codigoAcesso: Schema.Attribute.String & Schema.Attribute.Unique;
    contactosInstitucionais: Schema.Attribute.Component<
      'instituicao.contacto',
      true
    >;
    contatos: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    descricao: Schema.Attribute.Text;
    documentosLegais: Schema.Attribute.Component<
      'instituicao.documento-legal',
      true
    > &
      Schema.Attribute.Private;
    endereco: Schema.Attribute.String;
    enderecoEstruturado: Schema.Attribute.Component<
      'instituicao.endereco',
      false
    >;
    estado: Schema.Attribute.Enumeration<
      ['draft', 'pending_review', 'changes_requested', 'verified', 'suspended']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    estatisticas: Schema.Attribute.JSON;
    galeria: Schema.Attribute.Media<'images' | 'videos', true>;
    gestores: Schema.Attribute.Relation<'oneToMany', 'api::perfil.perfil'>;
    infraestruturas: Schema.Attribute.JSON;
    limiteAlunos: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::instituicao.instituicao'
    > &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images'>;
    motivoAlteracoes: Schema.Attribute.Text & Schema.Attribute.Private;
    natureza: Schema.Attribute.Enumeration<
      [
        'publica',
        'privada',
        'mista',
        'associacao',
        'fundacao',
        'cooperativa',
        'outra',
      ]
    >;
    nif: Schema.Attribute.String & Schema.Attribute.Private;
    niveisEnsino: Schema.Attribute.JSON;
    nome: Schema.Attribute.String & Schema.Attribute.Required;
    nomeLegal: Schema.Attribute.String;
    planoAtivo: Schema.Attribute.Enumeration<['gratuito', 'basico', 'premium']>;
    politicas: Schema.Attribute.Component<'instituicao.politica', true>;
    publishedAt: Schema.Attribute.DateTime;
    redesSociais: Schema.Attribute.JSON;
    regiao: Schema.Attribute.String;
    servicos: Schema.Attribute.JSON;
    sigla: Schema.Attribute.String;
    slug: Schema.Attribute.UID<'nome'> & Schema.Attribute.Unique;
    submetidaEm: Schema.Attribute.DateTime;
    tipo: Schema.Attribute.Enumeration<
      [
        'universidade',
        'instituto',
        'escola',
        'centro_formacao',
        'empresa',
        'ong',
        'laboratorio',
        'outro',
      ]
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    verificadaEm: Schema.Attribute.DateTime;
    website: Schema.Attribute.String;
  };
}

export interface ApiLikeLike extends Struct.CollectionTypeSchema {
  collectionName: 'likes';
  info: {
    displayName: 'Like';
    pluralName: 'likes';
    singularName: 'like';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['actor', 'targetType', 'targetId'];
        name: 'unique_like_actor_target';
        type: 'unique';
      },
    ];
  };
  attributes: {
    actor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::like.like'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMatchSuggestionMatchSuggestion
  extends Struct.CollectionTypeSchema {
  collectionName: 'match_suggestions';
  info: {
    description: 'Sugest\u00F5es do Match Terminal baseadas em afinidade';
    displayName: 'Match Suggestion';
    pluralName: 'match-suggestions';
    singularName: 'match-suggestion';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    aceitada: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entityId: Schema.Attribute.String & Schema.Attribute.Required;
    entityType: Schema.Attribute.Enumeration<
      ['curso', 'simulacao', 'experiencia', 'programa', 'projeto']
    >;
    estudante: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    eventId: Schema.Attribute.String & Schema.Attribute.Required;
    expiraEm: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::match-suggestion.match-suggestion'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    score: Schema.Attribute.Float;
    tierMinimo: Schema.Attribute.Enumeration<
      ['Bronze', 'Prata', 'Ouro', 'Diamante']
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    vista: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
  };
}

export interface ApiMensagemMensagem extends Struct.CollectionTypeSchema {
  collectionName: 'mensagens';
  info: {
    displayName: 'Mensagem';
    pluralName: 'mensagens';
    singularName: 'mensagem';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    conteudo: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    conversa: Schema.Attribute.Relation<'manyToOne', 'api::conversa.conversa'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    destinatario: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    lida: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lidaEm: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::mensagem.mensagem'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    remetente: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    tipo: Schema.Attribute.Enumeration<['texto', 'sistema']> &
      Schema.Attribute.DefaultTo<'texto'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMentoriaMentoria extends Struct.CollectionTypeSchema {
  collectionName: 'mentorias';
  info: {
    displayName: 'Mentoria';
    pluralName: 'mentorias';
    singularName: 'mentoria';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    area: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
      ]
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataHora: Schema.Attribute.DateTime;
    descricao: Schema.Attribute.Text;
    duracaoMinutos: Schema.Attribute.Integer;
    estudante: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    linkReuniao: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::mentoria.mentoria'
    > &
      Schema.Attribute.Private;
    mentor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['disponivel', 'agendada', 'concluida', 'cancelada']
    > &
      Schema.Attribute.DefaultTo<'disponivel'>;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiModuloItemModuloItem extends Struct.CollectionTypeSchema {
  collectionName: 'modulo_items';
  info: {
    displayName: 'Item de M\u00F3dulo';
    pluralName: 'modulo-items';
    singularName: 'modulo-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    conteudo: Schema.Attribute.RichText;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    duracaoMin: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::modulo-item.modulo-item'
    > &
      Schema.Attribute.Private;
    modulo: Schema.Attribute.Relation<'manyToOne', 'api::modulo.modulo'> &
      Schema.Attribute.Required;
    obrigatorio: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    ordem: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    requisitoConcluidoId: Schema.Attribute.String;
    tipo: Schema.Attribute.Enumeration<
      ['video', 'pdf', 'texto', 'quiz', 'tarefa', 'iframe']
    > &
      Schema.Attribute.Required;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.String;
  };
}

export interface ApiModuloModulo extends Struct.CollectionTypeSchema {
  collectionName: 'modulos';
  info: {
    displayName: 'M\u00F3dulo';
    pluralName: 'modulos';
    singularName: 'modulo';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    curso: Schema.Attribute.Relation<'manyToOne', 'api::curso.curso'>;
    desbloqueioCondicional: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::modulo.modulo'
    > &
      Schema.Attribute.Private;
    obrigatorio: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    ordem: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    publishedAt: Schema.Attribute.DateTime;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiNotificacaoNotificacao extends Struct.CollectionTypeSchema {
  collectionName: 'notificacoes';
  info: {
    displayName: 'Notifica\u00E7\u00E3o';
    pluralName: 'notificacoes';
    singularName: 'notificacao';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    actorId: Schema.Attribute.String;
    agrupada: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    contagemAgrupada: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<1>;
    corpo: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    data: Schema.Attribute.DateTime;
    entreguePor: Schema.Attribute.JSON;
    eventId: Schema.Attribute.String;
    lida: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lidaEm: Schema.Attribute.DateTime;
    link: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::notificacao.notificacao'
    > &
      Schema.Attribute.Private;
    mensagem: Schema.Attribute.Text & Schema.Attribute.Required;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String;
    targetType: Schema.Attribute.String;
    tipo: Schema.Attribute.String & Schema.Attribute.Required;
    titulo: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOnboardingVideoOnboardingVideo
  extends Struct.CollectionTypeSchema {
  collectionName: 'onboarding_videos';
  info: {
    description: 'V\u00EDdeo de onboarding por role (ADR-031)';
    displayName: 'Onboarding Video';
    pluralName: 'onboarding-videos';
    singularName: 'onboarding-video';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    duracaoSegundos: Schema.Attribute.Integer & Schema.Attribute.Required;
    embedType: Schema.Attribute.Enumeration<
      ['youtube', 'vimeo', 'r2', 'external']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'r2'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::onboarding-video.onboarding-video'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Enumeration<
      [
        'estudante',
        'mentor',
        'instituicao',
        'moderador',
        'comite_cientifico',
        'super_admin',
        'patrocinador',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    thumbnailUrl: Schema.Attribute.String;
    tituloEn: Schema.Attribute.String;
    tituloPt: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    videoUrl: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ApiPartilhaPartilha extends Struct.CollectionTypeSchema {
  collectionName: 'partilhas';
  info: {
    displayName: 'Partilha';
    pluralName: 'partilhas';
    singularName: 'partilha';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['actor', 'targetType', 'targetId', 'canal'];
        name: 'unique_internal_share_actor_target';
        type: 'unique';
      },
    ];
  };
  attributes: {
    actor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    canal: Schema.Attribute.Enumeration<
      ['interno', 'whatsapp', 'linkedin', 'twitter', 'email', 'outro']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'interno'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::partilha.partilha'
    > &
      Schema.Attribute.Private;
    nota: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPerfilVocacionalPerfilVocacional
  extends Struct.CollectionTypeSchema {
  collectionName: 'perfil_vocacionais';
  info: {
    displayName: 'Perfil Vocacional';
    pluralName: 'perfil-vocacionais';
    singularName: 'perfil-vocacional';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    aptidao: Schema.Attribute.Float;
    aptidaoTecnica: Schema.Attribute.Float;
    area: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
      ]
    >;
    areaMatch: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
      ]
    >;
    atual: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    calculationMethod: Schema.Attribute.Enumeration<
      ['heuristico_deterministico', 'ia_assistida']
    > &
      Schema.Attribute.DefaultTo<'heuristico_deterministico'>;
    certeza: Schema.Attribute.Enumeration<
      ['baixa', 'media', 'alta', 'BAIXA', 'MEDIA', 'ALTA']
    >;
    compatibilidadePsicologica: Schema.Attribute.Float;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dedicacao: Schema.Attribute.Float;
    dimensoes: Schema.Attribute.JSON;
    explanationVersion: Schema.Attribute.String;
    generatedWithAiSupport: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    heuristicsVersion: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::perfil-vocacional.perfil-vocacional'
    > &
      Schema.Attribute.Private;
    modelVersion: Schema.Attribute.String;
    motivacaoIntrinseca: Schema.Attribute.Float;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    potencialSucesso: Schema.Attribute.Float;
    publishedAt: Schema.Attribute.DateTime;
    razoes: Schema.Attribute.JSON;
    resumo: Schema.Attribute.Text;
    scoreGlobal: Schema.Attribute.Float;
    totalEventos: Schema.Attribute.Integer;
    ultimoCalculoEm: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPerfilPerfil extends Struct.CollectionTypeSchema {
  collectionName: 'perfis';
  info: {
    description: 'Perfil central do utilizador';
    displayName: 'Perfil';
    pluralName: 'perfis';
    singularName: 'perfil';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    activePrograms: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    activeStudents: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    anoAcademico: Schema.Attribute.String;
    anonymizedAt: Schema.Attribute.DateTime;
    aprovado: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    aprovadoEm: Schema.Attribute.DateTime;
    aprovadoPor: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    areaFormacao: Schema.Attribute.String;
    areasInteresse: Schema.Attribute.JSON;
    ativo: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    avatarUrl: Schema.Attribute.String;
    bannerUrl: Schema.Attribute.String;
    behavior_patterns: Schema.Attribute.Relation<
      'oneToMany',
      'api::behavior-pattern.behavior-pattern'
    >;
    bio: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
    capa: Schema.Attribute.Media<'images'>;
    codigoInstitucional: Schema.Attribute.String;
    competencias: Schema.Attribute.JSON;
    conquistas: Schema.Attribute.Relation<
      'manyToMany',
      'api::conquista.conquista'
    >;
    conquistasCount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    consentimentoEstado: Schema.Attribute.Enumeration<
      ['pendente', 'completo', 'requer_reconsentimento', 'bloqueado']
    > &
      Schema.Attribute.DefaultTo<'pendente'>;
    consents: Schema.Attribute.JSON;
    contaEstado: Schema.Attribute.Enumeration<['ativa', 'anonimizada']> &
      Schema.Attribute.DefaultTo<'ativa'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataNascimento: Schema.Attribute.Date;
    documentos: Schema.Attribute.JSON;
    email: Schema.Attribute.Email;
    estadoMenoridade: Schema.Attribute.Enumeration<
      ['pendente', 'adulto', 'menor']
    > &
      Schema.Attribute.DefaultTo<'pendente'>;
    feedPosts: Schema.Attribute.Relation<
      'oneToMany',
      'api::feed-post.feed-post'
    >;
    formacaoAcademica: Schema.Attribute.JSON;
    foto: Schema.Attribute.Media<'images'>;
    funcao: Schema.Attribute.String;
    guardianConsent: Schema.Attribute.JSON;
    headline: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 200;
      }>;
    historicoProfissional: Schema.Attribute.JSON;
    inscricoes: Schema.Attribute.Relation<
      'oneToMany',
      'api::inscricao.inscricao'
    >;
    instituicao: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    >;
    instituicaoGerida: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    >;
    language: Schema.Attribute.String & Schema.Attribute.DefaultTo<'pt-AO'>;
    legalAcceptedAt: Schema.Attribute.DateTime;
    legalDataProcessingVersion: Schema.Attribute.String;
    legalPrivacyVersion: Schema.Attribute.String;
    legalTermsVersion: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::perfil.perfil'
    > &
      Schema.Attribute.Private;
    lti_context: Schema.Attribute.JSON;
    modalidadeCusto: Schema.Attribute.String;
    modoAcesso: Schema.Attribute.Enumeration<['individual', 'institucional']> &
      Schema.Attribute.DefaultTo<'individual'>;
    motivoRejeicao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    natureza: Schema.Attribute.String;
    niveisEnsino: Schema.Attribute.JSON;
    nivelEnsino: Schema.Attribute.String;
    nome: Schema.Attribute.String & Schema.Attribute.Required;
    notificationPreferences: Schema.Attribute.JSON;
    oauthProvider: Schema.Attribute.Enumeration<['google', 'linkedin']>;
    oauthVerified: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    onboardingCompleto: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    preferenciasUi: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    regiao: Schema.Attribute.String;
    reputacao: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    socialLinks: Schema.Attribute.JSON;
    suspensaAte: Schema.Attribute.DateTime;
    telefone: Schema.Attribute.String;
    tipo: Schema.Attribute.Enumeration<
      [
        'estudante',
        'mentor',
        'instituicao',
        'moderador',
        'comite_cientifico',
        'super_admin',
        'patrocinador',
      ]
    > &
      Schema.Attribute.Required;
    tipoInstituicao: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String;
    vinkulosCount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    visibilitySettings: Schema.Attribute.JSON;
    website: Schema.Attribute.String;
    xp: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
  };
}

export interface ApiPostPost extends Struct.CollectionTypeSchema {
  collectionName: 'posts';
  info: {
    displayName: 'Post';
    pluralName: 'posts';
    singularName: 'post';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    aprovada: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    conteudo: Schema.Attribute.RichText;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    descricao: Schema.Attribute.Text;
    estado: Schema.Attribute.Enumeration<['draft', 'published', 'archived']> &
      Schema.Attribute.DefaultTo<'draft'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::post.post'> &
      Schema.Attribute.Private;
    mediaUrls: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Unique;
    tags: Schema.Attribute.JSON;
    tipo: Schema.Attribute.Enumeration<
      [
        'post',
        'aviso',
        'noticia',
        'conquista_partilhada',
        'vocacional',
        'institucional',
      ]
    >;
    tipoAutor: Schema.Attribute.Enumeration<
      ['mentor', 'instituicao', 'plataforma', 'aluno']
    >;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiProgramaPrograma extends Struct.CollectionTypeSchema {
  collectionName: 'programas';
  info: {
    displayName: 'Programa';
    pluralName: 'programas';
    singularName: 'programa';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    area: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
      ]
    >;
    capa: Schema.Attribute.Media<'images'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadorTipo: Schema.Attribute.Enumeration<
      ['mentor', 'instituicao', 'super_admin']
    >;
    cursos: Schema.Attribute.Relation<'manyToMany', 'api::curso.curso'>;
    dataFim: Schema.Attribute.DateTime;
    dataInicio: Schema.Attribute.DateTime;
    descricao: Schema.Attribute.Text;
    duracao: Schema.Attribute.String;
    estado: Schema.Attribute.Enumeration<
      ['draft', 'review', 'approved', 'published', 'archived']
    > &
      Schema.Attribute.DefaultTo<'draft'>;
    experiencias: Schema.Attribute.Relation<
      'manyToMany',
      'api::experiencia.experiencia'
    >;
    historicoEstados: Schema.Attribute.JSON;
    instituicao: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    >;
    isDemo: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::programa.programa'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    metodologia: Schema.Attribute.Text;
    modalidade: Schema.Attribute.Enumeration<
      ['presencial', 'online', 'hibrido']
    >;
    motivoRejeicao: Schema.Attribute.Text;
    precoPolicy: Schema.Attribute.JSON;
    projetos: Schema.Attribute.Relation<'manyToMany', 'api::projeto.projeto'>;
    proposito: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    recursos: Schema.Attribute.JSON;
    regrasMatricula: Schema.Attribute.JSON;
    rejeitadoEm: Schema.Attribute.DateTime;
    rejeitadoPor: Schema.Attribute.String;
    requisitos: Schema.Attribute.Text;
    responsavel: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    simulacoes: Schema.Attribute.Relation<
      'manyToMany',
      'api::simulacao.simulacao'
    >;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Unique;
    tags: Schema.Attribute.JSON;
    tipo: Schema.Attribute.Enumeration<['standard', 'shadowapro', 'eduvisit']> &
      Schema.Attribute.DefaultTo<'standard'>;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    vagas: Schema.Attribute.Integer;
  };
}

export interface ApiProjetoProjeto extends Struct.CollectionTypeSchema {
  collectionName: 'projetos';
  info: {
    displayName: 'Projeto';
    pluralName: 'projetos';
    singularName: 'projeto';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    abstract: Schema.Attribute.Text;
    acessoCoreACL: Schema.Attribute.JSON;
    area: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
        'AGRONOMIA',
        'OUTRO',
      ]
    >;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    buscandoParceiros: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    colaboradores: Schema.Attribute.JSON;
    core: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    demoUrl: Schema.Attribute.String;
    descricao: Schema.Attribute.Text;
    estado: Schema.Attribute.Enumeration<
      ['draft', 'review', 'approved', 'published', 'archived', 'hidden']
    > &
      Schema.Attribute.DefaultTo<'draft'>;
    historicoEstados: Schema.Attribute.JSON;
    isDemo: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::projeto.projeto'
    > &
      Schema.Attribute.Private;
    media: Schema.Attribute.Media<'images' | 'files' | 'videos', true>;
    mediaUrls: Schema.Attribute.JSON;
    modos: Schema.Attribute.JSON;
    motivoRejeicao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    rejeitadoEm: Schema.Attribute.DateTime;
    rejeitadoPor: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    repositorioUrl: Schema.Attribute.String;
    repoUrl: Schema.Attribute.String;
    selo: Schema.Attribute.Enumeration<
      ['publicado', 'validado_mentor', 'validado_instituicao', 'excelencia']
    >;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Unique;
    tags: Schema.Attribute.JSON;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    visibilidade: Schema.Attribute.Enumeration<['publico', 'privado']> &
      Schema.Attribute.DefaultTo<'publico'>;
    votos: Schema.Attribute.JSON;
  };
}

export interface ApiProjetoAcessoPedidoProjetoAcessoPedido
  extends Struct.CollectionTypeSchema {
  collectionName: 'projeto_acesso_pedidos';
  info: {
    displayName: 'Projeto Acesso Pedido';
    pluralName: 'projeto-acesso-pedidos';
    singularName: 'projeto-acesso-pedido';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataResposta: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::projeto-acesso-pedido.projeto-acesso-pedido'
    > &
      Schema.Attribute.Private;
    motivo: Schema.Attribute.Text;
    perfilSolicitante: Schema.Attribute.Relation<
      'manyToOne',
      'api::perfil.perfil'
    > &
      Schema.Attribute.Required;
    projeto: Schema.Attribute.Relation<'manyToOne', 'api::projeto.projeto'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<['pendente', 'aprovado', 'rejeitado']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pendente'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPropostaProposta extends Struct.CollectionTypeSchema {
  collectionName: 'propostas';
  info: {
    displayName: 'Proposta';
    pluralName: 'propostas';
    singularName: 'proposta';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    descricao: Schema.Attribute.Text;
    estudante: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    expiradaEm: Schema.Attribute.DateTime;
    instituicao: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    > &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::proposta.proposta'
    > &
      Schema.Attribute.Private;
    mensagem: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['pendente', 'aceita', 'recusada', 'expirada']
    > &
      Schema.Attribute.DefaultTo<'pendente'>;
    tipo: Schema.Attribute.Enumeration<
      ['emprego', 'estagio', 'bolsa', 'parceria']
    >;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiQaPerguntaQaPergunta extends Struct.CollectionTypeSchema {
  collectionName: 'qa_perguntas';
  info: {
    displayName: 'QA Pergunta';
    pluralName: 'qa-perguntas';
    singularName: 'qa-pergunta';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autorId: Schema.Attribute.String & Schema.Attribute.Required;
    autorNome: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    experiencia: Schema.Attribute.Relation<
      'manyToOne',
      'api::experiencia.experiencia'
    >;
    likes: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::qa-pergunta.qa-pergunta'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    resposta: Schema.Attribute.Relation<
      'oneToOne',
      'api::qa-resposta.qa-resposta'
    >;
    texto: Schema.Attribute.Text & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiQaRespostaQaResposta extends Struct.CollectionTypeSchema {
  collectionName: 'qa_respostas';
  info: {
    displayName: 'QA Resposta';
    pluralName: 'qa-respostas';
    singularName: 'qa-resposta';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autorId: Schema.Attribute.String & Schema.Attribute.Required;
    autorNome: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::qa-resposta.qa-resposta'
    > &
      Schema.Attribute.Private;
    pergunta: Schema.Attribute.Relation<
      'oneToOne',
      'api::qa-pergunta.qa-pergunta'
    >;
    publishedAt: Schema.Attribute.DateTime;
    texto: Schema.Attribute.Text & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiRatingRating extends Struct.CollectionTypeSchema {
  collectionName: 'ratings';
  info: {
    displayName: 'Rating';
    pluralName: 'ratings';
    singularName: 'rating';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['actor', 'targetType', 'targetId'];
        name: 'unique_rating_actor_target';
        type: 'unique';
      },
    ];
  };
  attributes: {
    actor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    comentario: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    criterios: Schema.Attribute.JSON;
    editadoEm: Schema.Attribute.DateTime;
    estrelas: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          max: 5;
          min: 1;
        },
        number
      >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::rating.rating'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    targetId: Schema.Attribute.String & Schema.Attribute.Required;
    targetType: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSimulacaoSimulacao extends Struct.CollectionTypeSchema {
  collectionName: 'simulacoes';
  info: {
    displayName: 'Simula\u00E7\u00E3o';
    pluralName: 'simulacoes';
    singularName: 'simulacao';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    area: Schema.Attribute.Enumeration<
      [
        'SAUDE',
        'ENGENHARIA',
        'TECNOLOGIA',
        'DIREITO',
        'GESTAO',
        'EDUCACAO',
        'ARTES',
        'CIENCIAS_AGRARIAS',
        'CIENCIAS_SOCIAIS',
        'COMUNICACAO',
        'CIENCIAS_NATURAIS',
        'ARQUITETURA',
        'TURISMO_HOTELARIA',
        'DESPORTO',
        'OUTRA',
      ]
    >;
    autor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    autorId: Schema.Attribute.String;
    comiteValidacao: Schema.Attribute.Text;
    conteudoUrl: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criteriosAvaliacao: Schema.Attribute.JSON;
    dataValidacao: Schema.Attribute.DateTime;
    descricao: Schema.Attribute.Text;
    estado: Schema.Attribute.Enumeration<
      ['draft', 'review', 'approved', 'published', 'archived']
    > &
      Schema.Attribute.DefaultTo<'draft'>;
    executorConfig: Schema.Attribute.JSON;
    historicoEstados: Schema.Attribute.JSON;
    instituicao: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    >;
    isDemo: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::simulacao.simulacao'
    > &
      Schema.Attribute.Private;
    materiaisInfo: Schema.Attribute.JSON;
    materiaisLab: Schema.Attribute.JSON;
    motivoRejeicao: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    nivel: Schema.Attribute.Enumeration<['basico', 'medio', 'avancado']>;
    nome: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    rejeitadoEm: Schema.Attribute.DateTime;
    rejeitadoPor: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    slug: Schema.Attribute.UID<'titulo'> & Schema.Attribute.Unique;
    tags: Schema.Attribute.JSON;
    tentativasMaximas: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tipo: Schema.Attribute.Integer;
    tipoLab: Schema.Attribute.Enumeration<
      ['sandbox', 'prova', 'desafio', 'experimento']
    >;
    tipoSimulacao: Schema.Attribute.Enumeration<['tipo1', 'tipo2', 'tipo3']>;
    titulo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    validadoAcademicamente: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface ApiSubscricaoSubscricao extends Struct.CollectionTypeSchema {
  collectionName: 'subscricoes';
  info: {
    displayName: 'Subscri\u00E7\u00E3o';
    pluralName: 'subscricoes';
    singularName: 'subscricao';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    ativa: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    features: Schema.Attribute.JSON;
    fimEm: Schema.Attribute.DateTime;
    inicioEm: Schema.Attribute.DateTime;
    instituicao: Schema.Attribute.Relation<
      'manyToOne',
      'api::instituicao.instituicao'
    >;
    limiteAlunos: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::subscricao.subscricao'
    > &
      Schema.Attribute.Private;
    moeda: Schema.Attribute.String;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    plano: Schema.Attribute.Enumeration<
      ['gratuito', 'premium', 'institucional_basico', 'institucional_premium']
    >;
    publishedAt: Schema.Attribute.DateTime;
    quotas: Schema.Attribute.JSON;
    tier: Schema.Attribute.Enumeration<
      ['free', 'basic', 'premium', 'enterprise']
    > &
      Schema.Attribute.DefaultTo<'free'>;
    tipo: Schema.Attribute.Enumeration<['individual', 'institucional']>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    valorPago: Schema.Attribute.Decimal;
  };
}

export interface ApiTelemetriaTelemetria extends Struct.CollectionTypeSchema {
  collectionName: 'telemetrias';
  info: {
    displayName: 'Telemetria';
    pluralName: 'telemetrias';
    singularName: 'telemetria';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    clientTimestamp: Schema.Attribute.BigInteger;
    correlationId: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dados: Schema.Attribute.JSON;
    eventId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::telemetria.telemetria'
    > &
      Schema.Attribute.Private;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String & Schema.Attribute.Required;
    targetId: Schema.Attribute.String;
    targetType: Schema.Attribute.String;
    tipo: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.String;
    userAgent: Schema.Attribute.String;
    visibilityState: Schema.Attribute.String;
  };
}

export interface ApiTentativaTentativa extends Struct.CollectionTypeSchema {
  collectionName: 'tentativas';
  info: {
    displayName: 'Tentativa de Simula\u00E7\u00E3o';
    pluralName: 'tentativas';
    singularName: 'tentativa';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    areaScore: Schema.Attribute.JSON;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataFim: Schema.Attribute.DateTime;
    dataInicio: Schema.Attribute.DateTime;
    duracaoSegundos: Schema.Attribute.Integer;
    executorTipo: Schema.Attribute.Enumeration<['tipo1', 'tipo2', 'tipo3']>;
    feedback: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::tentativa.tentativa'
    > &
      Schema.Attribute.Private;
    logsExecucao: Schema.Attribute.JSON;
    metadata: Schema.Attribute.JSON;
    outputExecucao: Schema.Attribute.JSON;
    perfil: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    score: Schema.Attribute.Decimal & Schema.Attribute.DefaultTo<0>;
    simulacao: Schema.Attribute.Relation<
      'manyToOne',
      'api::simulacao.simulacao'
    > &
      Schema.Attribute.Required;
    status: Schema.Attribute.Enumeration<
      ['em_progresso', 'concluida', 'falhou', 'cancelada']
    >;
    sugestao: Schema.Attribute.Text;
    tentativaNum: Schema.Attribute.Integer & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiUiStringUiString extends Struct.CollectionTypeSchema {
  collectionName: 'ui_strings';
  info: {
    description: 'Fonte da Verdade para UX Writing, Microcopy e Tom de Voz.';
    displayName: 'Soberania de Conte\u00FAdo (Copy)';
    pluralName: 'ui-strings';
    singularName: 'ui-string';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    comentario_dev: Schema.Attribute.String;
    contexto: Schema.Attribute.Enumeration<
      ['landing', 'auth', 'dashboard', 'cursos', 'simulacoes', 'global']
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    key: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::ui-string.ui-string'
    >;
    publishedAt: Schema.Attribute.DateTime;
    tom_de_voz: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    value: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface ApiVinculoVinculo extends Struct.CollectionTypeSchema {
  collectionName: 'vinculos';
  info: {
    displayName: 'V\u00EDnculo';
    pluralName: 'vinculos';
    singularName: 'vinculo';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['solicitante', 'destinatario', 'tipo'];
        name: 'unique_vinculo_solicitante_destinatario_tipo';
        type: 'unique';
      },
    ];
  };
  attributes: {
    connectionType: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    dataTerminacao: Schema.Attribute.DateTime;
    destinatario: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    documentoUrl: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::vinculo.vinculo'
    > &
      Schema.Attribute.Private;
    mensagem: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 300;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    receiverId: Schema.Attribute.String & Schema.Attribute.Required;
    resolvidoEm: Schema.Attribute.DateTime;
    senderId: Schema.Attribute.String & Schema.Attribute.Required;
    solicitante: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'>;
    status: Schema.Attribute.Enumeration<
      ['pendente', 'aprovado', 'rejeitado', 'concluido']
    > &
      Schema.Attribute.DefaultTo<'pendente'>;
    tipo: Schema.Attribute.Enumeration<
      ['aluno-mentor', 'mentor-instituicao', 'aluno-instituicao']
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    visibleOnProfile: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
  };
}

export interface ApiVotoProjetoVotoProjeto extends Struct.CollectionTypeSchema {
  collectionName: 'voto_projetos';
  info: {
    displayName: 'Voto em Projeto';
    pluralName: 'voto-projetos';
    singularName: 'voto-projeto';
  };
  options: {
    draftAndPublish: false;
    indexes: [
      {
        columns: ['actor', 'projeto', 'tipo'];
        name: 'unique_voto_actor_projeto_tipo';
        type: 'unique';
      },
    ];
  };
  attributes: {
    actor: Schema.Attribute.Relation<'manyToOne', 'api::perfil.perfil'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    criadoEm: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::voto-projeto.voto-projeto'
    > &
      Schema.Attribute.Private;
    projeto: Schema.Attribute.Relation<'manyToOne', 'api::projeto.projeto'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    tipo: Schema.Attribute.Enumeration<['upvote', 'endorsement', 'fork']>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::audit-log': AdminAuditLog;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::audit-log.audit-log': ApiAuditLogAuditLog;
      'api::behavior-pattern.behavior-pattern': ApiBehaviorPatternBehaviorPattern;
      'api::bookmark.bookmark': ApiBookmarkBookmark;
      'api::certificado.certificado': ApiCertificadoCertificado;
      'api::comment.comment': ApiCommentComment;
      'api::conquista-utilizador.conquista-utilizador': ApiConquistaUtilizadorConquistaUtilizador;
      'api::conquista.conquista': ApiConquistaConquista;
      'api::consentimento.consentimento': ApiConsentimentoConsentimento;
      'api::conversa.conversa': ApiConversaConversa;
      'api::curso.curso': ApiCursoCurso;
      'api::denuncia.denuncia': ApiDenunciaDenuncia;
      'api::documento-legal.documento-legal': ApiDocumentoLegalDocumentoLegal;
      'api::domain-event.domain-event': ApiDomainEventDomainEvent;
      'api::experiencia-participante.experiencia-participante': ApiExperienciaParticipanteExperienciaParticipante;
      'api::experiencia.experiencia': ApiExperienciaExperiencia;
      'api::feature-flag.feature-flag': ApiFeatureFlagFeatureFlag;
      'api::feed-entry.feed-entry': ApiFeedEntryFeedEntry;
      'api::feed-post.feed-post': ApiFeedPostFeedPost;
      'api::inscricao-programa.inscricao-programa': ApiInscricaoProgramaInscricaoPrograma;
      'api::inscricao.inscricao': ApiInscricaoInscricao;
      'api::instituicao.instituicao': ApiInstituicaoInstituicao;
      'api::like.like': ApiLikeLike;
      'api::match-suggestion.match-suggestion': ApiMatchSuggestionMatchSuggestion;
      'api::mensagem.mensagem': ApiMensagemMensagem;
      'api::mentoria.mentoria': ApiMentoriaMentoria;
      'api::modulo-item.modulo-item': ApiModuloItemModuloItem;
      'api::modulo.modulo': ApiModuloModulo;
      'api::notificacao.notificacao': ApiNotificacaoNotificacao;
      'api::onboarding-video.onboarding-video': ApiOnboardingVideoOnboardingVideo;
      'api::partilha.partilha': ApiPartilhaPartilha;
      'api::perfil-vocacional.perfil-vocacional': ApiPerfilVocacionalPerfilVocacional;
      'api::perfil.perfil': ApiPerfilPerfil;
      'api::post.post': ApiPostPost;
      'api::programa.programa': ApiProgramaPrograma;
      'api::projeto-acesso-pedido.projeto-acesso-pedido': ApiProjetoAcessoPedidoProjetoAcessoPedido;
      'api::projeto.projeto': ApiProjetoProjeto;
      'api::proposta.proposta': ApiPropostaProposta;
      'api::qa-pergunta.qa-pergunta': ApiQaPerguntaQaPergunta;
      'api::qa-resposta.qa-resposta': ApiQaRespostaQaResposta;
      'api::rating.rating': ApiRatingRating;
      'api::simulacao.simulacao': ApiSimulacaoSimulacao;
      'api::subscricao.subscricao': ApiSubscricaoSubscricao;
      'api::telemetria.telemetria': ApiTelemetriaTelemetria;
      'api::tentativa.tentativa': ApiTentativaTentativa;
      'api::ui-string.ui-string': ApiUiStringUiString;
      'api::vinculo.vinculo': ApiVinculoVinculo;
      'api::voto-projeto.voto-projeto': ApiVotoProjetoVotoProjeto;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
