import { describe, expect, it } from 'vitest';
import {
  PerfilPendenteSchema,
  AprovacaoActionSchema,
  OAuthFinalizarRoleChoiceSchema,
  OAuthFinalizarOtpSchema,
} from './auth.js';
import { DomainEventName, EventPayloadSchemas } from '../domain-events.js';

describe('PerfilPendenteSchema', () => {
  it('validates a mentor pending profile', () => {
    const result = PerfilPendenteSchema.parse({
      id: 1,
      userId: 42,
      nome: 'Carlos Silva',
      tipo: 'mentor',
      email: 'carlos@pdc.ao',
      createdAt: '2026-05-08T10:00:00.000Z',
      areaFormacao: 'Engenharia de Software',
      regiao: 'Luanda',
    });
    expect(result.id).toBe(1);
    expect(result.tipo).toBe('mentor');
  });

  it('validates an instituicao pending profile with documentos', () => {
    const result = PerfilPendenteSchema.parse({
      id: 2,
      userId: 99,
      nome: 'Universidade Agostinho Neto',
      tipo: 'instituicao',
      email: 'uan@pdc.ao',
      createdAt: '2026-05-08T10:00:00.000Z',
      documentos: [{ tipo: 'registo_comercial', url: 'https://example.com/doc.pdf' }],
      tipoInstituicao: 'universidade',
      natureza: 'publica',
    });
    expect(result.tipo).toBe('instituicao');
    expect(result.documentos).toHaveLength(1);
  });

  it('rejects estudante as tipo', () => {
    expect(() => PerfilPendenteSchema.parse({
      id: 1,
      userId: 1,
      nome: 'Ana',
      tipo: 'estudante',
      email: 'ana@pdc.ao',
      createdAt: '2026-05-08T10:00:00.000Z',
    })).toThrow();
  });

  it('rejects missing id', () => {
    expect(() => PerfilPendenteSchema.parse({
      userId: 1,
      nome: 'Ana',
      tipo: 'mentor',
      email: 'ana@pdc.ao',
      createdAt: '2026-05-08T10:00:00.000Z',
    })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => PerfilPendenteSchema.parse({
      id: 1,
      userId: 1,
      nome: 'Ana',
      tipo: 'mentor',
      email: 'not-an-email',
      createdAt: '2026-05-08T10:00:00.000Z',
    })).toThrow();
  });
});

describe('AprovacaoActionSchema', () => {
  it('validates approval without motivo', () => {
    const result = AprovacaoActionSchema.parse({ perfilId: 'p1', aprovado: true });
    expect(result.aprovado).toBe(true);
  });

  it('validates rejection with motivo of valid length', () => {
    const motivo = 'a'.repeat(20);
    const result = AprovacaoActionSchema.parse({ perfilId: 'p1', aprovado: false, motivo });
    expect(result.aprovado).toBe(false);
    if (!result.aprovado) expect(result.motivo).toHaveLength(20);
  });

  it('rejects rejection without motivo', () => {
    expect(() => AprovacaoActionSchema.parse({ perfilId: 'p1', aprovado: false })).toThrow();
  });

  it('rejects motivo shorter than 10 characters', () => {
    expect(() => AprovacaoActionSchema.parse({
      perfilId: 'p1',
      aprovado: false,
      motivo: 'curto',
    })).toThrow();
  });

  it('rejects motivo longer than 500 characters', () => {
    expect(() => AprovacaoActionSchema.parse({
      perfilId: 'p1',
      aprovado: false,
      motivo: 'a'.repeat(501),
    })).toThrow();
  });
});

describe('OAuthFinalizarRoleChoiceSchema', () => {
  it('validates estudante role choice', () => {
    const result = OAuthFinalizarRoleChoiceSchema.parse({ role: 'estudante' });
    expect(result.role).toBe('estudante');
  });

  it('validates mentor role choice', () => {
    const result = OAuthFinalizarRoleChoiceSchema.parse({
      role: 'mentor',
      areaEspecialidade: 'TI',
      documentos: [{ tipo: 'credencial_mentor', url: 'blob:http://localhost/doc' }],
    });
    expect(result.role).toBe('mentor');
  });

  it('validates instituicao role choice', () => {
    const result = OAuthFinalizarRoleChoiceSchema.parse({
      role: 'instituicao',
      nomeInstituicao: 'ISPTEC',
      tipoInstituicao: 'Universidade',
      documentos: [{ tipo: 'credencial_instituicao', url: 'blob:http://localhost/doc' }],
    });
    expect(result.role).toBe('instituicao');
  });

  it('rejects admin/moderation roles', () => {
    expect(() => OAuthFinalizarRoleChoiceSchema.parse({ role: 'super_admin' })).toThrow();
    expect(() => OAuthFinalizarRoleChoiceSchema.parse({ role: 'moderador' })).toThrow();
  });

  it('rejects invalid role', () => {
    expect(() => OAuthFinalizarRoleChoiceSchema.parse({ role: 'hacker' })).toThrow();
  });

  it('rejects mentor role choice without uploaded documents', () => {
    expect(() => OAuthFinalizarRoleChoiceSchema.parse({
      role: 'mentor',
      areaEspecialidade: 'TI',
      documentos: [],
    })).toThrow();
  });
});

describe('OAuthFinalizarOtpSchema', () => {
  it('validates a 6-digit OTP', () => {
    const result = OAuthFinalizarOtpSchema.parse({ otp: '123456' });
    expect(result.otp).toBe('123456');
  });

  it('rejects OTP shorter than 6 characters', () => {
    expect(() => OAuthFinalizarOtpSchema.parse({ otp: '12345' })).toThrow();
  });

  it('rejects OTP longer than 6 characters', () => {
    expect(() => OAuthFinalizarOtpSchema.parse({ otp: '1234567' })).toThrow();
  });

  it('rejects non-numeric OTP', () => {
    expect(() => OAuthFinalizarOtpSchema.parse({ otp: '12345a' })).toThrow();
  });

  it('does not require email in body', () => {
    expect(() => OAuthFinalizarOtpSchema.parse({ otp: '123456' })).not.toThrow();
  });
});

describe('DomainEventName.PERFIL_REJEITADO', () => {
  it('has canonical value', () => {
    expect(DomainEventName.PERFIL_REJEITADO).toBe('perfil.rejeitado');
  });

  it('payload schema validates with required motivo', () => {
    const schema = EventPayloadSchemas[DomainEventName.PERFIL_REJEITADO];
    if (!schema) throw new Error('PERFIL_REJEITADO schema not found in EventPayloadSchemas');
    expect(() => {
      schema.parse({
        perfilId: 'p1',
        rejeitadorId: 'mod-1',
        motivo: 'Documentação insuficiente para análise',
        role: 'mentor',
        userId: 'user-1',
      });
    }).not.toThrow();
  });

  it('payload schema rejects missing motivo', () => {
    const schema = EventPayloadSchemas[DomainEventName.PERFIL_REJEITADO];
    if (!schema) throw new Error('PERFIL_REJEITADO schema not found in EventPayloadSchemas');
    const result = schema.safeParse({ perfilId: 'p1', rejeitadorId: 'mod-1', role: 'mentor' });
    expect(result.success).toBe(false);
  });

  it('payload schema rejects missing role', () => {
    const schema = EventPayloadSchemas[DomainEventName.PERFIL_REJEITADO];
    if (!schema) throw new Error('PERFIL_REJEITADO schema not found in EventPayloadSchemas');
    const result = schema.safeParse({ perfilId: 'p1', rejeitadorId: 'mod-1', motivo: 'Motivo válido com detalhe' });
    expect(result.success).toBe(false);
  });
});
