import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono, type Context, type Next } from 'hono';
import { ltiRoutes } from './lti.js';

const getPublicJwksMock = vi.hoisted(() => vi.fn().mockResolvedValue({ keys: [{ kid: 'pdc-lti-key-1', kty: 'RSA' }] }));
const sendScoreMock = vi.hoisted(() => vi.fn().mockResolvedValue({ status: 'success' }));
const getMembershipsMock = vi.hoisted(() => vi.fn().mockResolvedValue([{ user_id: 'lms-user-1' }]));

vi.mock('../modules/auth/auth.middleware.js', () => ({
  verifyJwt: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1', role: 'super_admin' });
    await next();
  },
}));

vi.mock('../modules/lti/lti.jwks.js', () => ({
  getPublicJwks: getPublicJwksMock,
}));

vi.mock('../modules/lti/lti.ags.js', () => ({
  ltiAgsService: {
    sendScore: sendScoreMock,
  },
}));

vi.mock('../modules/lti/lti.nrps.js', () => ({
  ltiNrps: {
    getMemberships: getMembershipsMock,
  },
}));

describe('ltiRoutes', () => {
  const app = new Hono().route('/lti', ltiRoutes);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expõe JWKS quando configurado', async () => {
    const res = await app.request('/lti/jwks');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ keys: [{ kid: 'pdc-lti-key-1', kty: 'RSA' }] });
    expect(getPublicJwksMock).toHaveBeenCalledTimes(1);
  });

  it('retorna 503 sem mascarar JWKS mal configurado', async () => {
    getPublicJwksMock.mockRejectedValueOnce(new Error('LTI_PUBLIC_KEY não configurada'));

    const res = await app.request('/lti/jwks');

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      code: 'LTI_JWKS_UNAVAILABLE',
      error: 'LTI_PUBLIC_KEY não configurada',
    });
  });

  it('declara login/launch como não implementados em vez de deixar rota muda', async () => {
    const login = await app.request('/lti/login', { method: 'POST' });
    const launch = await app.request('/lti/launch', { method: 'POST' });

    expect(login.status).toBe(501);
    expect(launch.status).toBe(501);
    await expect(login.json()).resolves.toMatchObject({ code: 'LTI_LAUNCH_NOT_IMPLEMENTED' });
  });

  it('encaminha AGS score com contrato LtiScoreSchema', async () => {
    const score = {
      userId: 'lms-user-1',
      activityId: 'tentativa-1',
      scoreGiven: 85,
      scoreMaximum: 100,
      comment: 'Bom desempenho',
      timestamp: '2026-07-05T12:00:00.000Z',
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
    };

    const res = await app.request('/lti/ags/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-lms-access-token': 'token-lms' },
      body: JSON.stringify({
        lineitemUrl: 'https://lms.example.com/lineitems/1',
        score,
      }),
    });

    expect(res.status).toBe(200);
    expect(sendScoreMock).toHaveBeenCalledWith(
      'https://lms.example.com/lineitems/1',
      score,
      'token-lms',
    );
  });

  it('aceita timestamp AGS com offset numérico', async () => {
    const score = {
      userId: 'lms-user-1',
      activityId: 'tentativa-1',
      scoreGiven: 85,
      scoreMaximum: 100,
      timestamp: '2026-07-05T12:00:00+02:00',
      activityProgress: 'Submitted',
      gradingProgress: 'PendingManual',
    };

    const res = await app.request('/lti/ags/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-lms-access-token': 'token-lms' },
      body: JSON.stringify({ lineitemUrl: 'https://lms.example.com/lineitems/1', score }),
    });

    expect(res.status).toBe(200);
  });

  it('rejeita AGS score inválido antes de chamar LMS', async () => {
    const res = await app.request('/lti/ags/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lineitemUrl: 'https://lms.example.com/lineitems/1',
        score: { userId: '', scoreGiven: -1 },
      }),
    });

    expect(res.status).toBe(400);
    expect(sendScoreMock).not.toHaveBeenCalled();
  });

  it('rejeita scoreGiven superior a scoreMaximum', async () => {
    const res = await app.request('/lti/ags/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lineitemUrl: 'https://lms.example.com/lineitems/1',
        score: {
          userId: 'lms-user-1',
          activityId: 'tentativa-1',
          scoreGiven: 110,
          scoreMaximum: 100,
          timestamp: '2026-07-05T12:00:00.000Z',
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded',
        },
      }),
    });

    expect(res.status).toBe(400);
    expect(sendScoreMock).not.toHaveBeenCalled();
  });

  it('mapeia falha LMS no AGS para 502 estruturado', async () => {
    sendScoreMock.mockRejectedValueOnce(new Error('LMS indisponível'));
    const score = {
      userId: 'lms-user-1',
      activityId: 'tentativa-1',
      scoreGiven: 85,
      scoreMaximum: 100,
      timestamp: '2026-07-05T12:00:00.000Z',
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
    };

    const res = await app.request('/lti/ags/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-lms-access-token': 'token-lms' },
      body: JSON.stringify({ lineitemUrl: 'https://lms.example.com/lineitems/1', score }),
    });

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ code: 'LTI_AGS_UNAVAILABLE', error: 'LMS indisponível' });
  });

  it('rejeita vocabulário AGS inválido antes de chamar LMS', async () => {
    const res = await app.request('/lti/ags/scores', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lineitemUrl: 'https://lms.example.com/lineitems/1',
        score: {
          userId: 'lms-user-1',
          activityId: 'tentativa-1',
          scoreGiven: 85,
          scoreMaximum: 100,
          timestamp: '2026-07-05T12:00:00.000Z',
          activityProgress: 'Done',
          gradingProgress: 'FullyGraded',
        },
      }),
    });

    expect(res.status).toBe(400);
  });

  it('encaminha consulta NRPS com envelope explícito', async () => {
    const res = await app.request('/lti/nrps/memberships?nrpsUrl=https%3A%2F%2Flms.example.com%2Fnrps', {
      headers: { 'x-lms-access-token': 'token-lms' },
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ data: [{ user_id: 'lms-user-1' }] });
    expect(getMembershipsMock).toHaveBeenCalledWith('https://lms.example.com/nrps', 'token-lms');
  });

  it('rejeita NRPS sem access token', async () => {
    const res = await app.request('/lti/nrps/memberships?nrpsUrl=https%3A%2F%2Flms.example.com%2Fnrps');

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ code: 'LTI_NRPS_MISSING_TOKEN' });
  });

  it('mapeia falha LMS no NRPS para 502 estruturado', async () => {
    getMembershipsMock.mockRejectedValueOnce(new Error('NRPS timeout'));

    const res = await app.request('/lti/nrps/memberships?nrpsUrl=https%3A%2F%2Flms.example.com%2Fnrps', {
      headers: { 'x-lms-access-token': 'token-lms' },
    });

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toMatchObject({ code: 'LTI_NRPS_UNAVAILABLE', error: 'NRPS timeout' });
  });
});