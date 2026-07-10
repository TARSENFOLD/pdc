import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { requireProductionCsvEnv, requireProductionEnv } from './env-validation';

const originalEnv = { ...process.env };

function restoreEnv(): void {
  for (const key in process.env) {
    if (!(key in originalEnv)) Reflect.deleteProperty(process.env, key);
  }
  for (const key in originalEnv) process.env[key] = originalEnv[key];
}

describe('Strapi env-validation', () => {
  afterEach(() => {
    restoreEnv();
  });

  it('não bloqueia ambiente não-produção', () => {
    process.env.NODE_ENV = 'development';
    assert.doesNotThrow(() => { requireProductionEnv(['DATABASE_URL']); });
  });

  it('rejeita variáveis ausentes ou placeholders em produção', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = '<database-url>';

    assert.throws(() => { requireProductionEnv(['DATABASE_URL']); }, /DATABASE_URL/);
  });

  it('aceita variáveis reais em produção', () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://user:pass@host:5432/db';

    assert.doesNotThrow(() => { requireProductionEnv(['DATABASE_URL']); });
  });

  it('rejeita CSV com menos valores reais que o mínimo', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_KEYS = 'real-1,real-2';

    assert.throws(() => { requireProductionCsvEnv('APP_KEYS', 4); }, /APP_KEYS requer 4 valores reais/);
  });

  it('rejeita CSV com placeholder em qualquer entrada', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_KEYS = 'real-1,real-2,<placeholder>,real-4';

    assert.throws(() => { requireProductionCsvEnv('APP_KEYS', 4); }, /APP_KEYS/);
  });

  it('aceita CSV com quantidade mínima de valores reais', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_KEYS = 'real-1,real-2,real-3,real-4';

    assert.doesNotThrow(() => { requireProductionCsvEnv('APP_KEYS', 4); });
  });

  it('rejeita CSV com entradas duplicadas', () => {
    process.env.NODE_ENV = 'production';
    process.env.APP_KEYS = 'real-1,real-1,real-2,real-3';

    assert.throws(() => { requireProductionCsvEnv('APP_KEYS', 4); }, /APP_KEYS/);
  });
});