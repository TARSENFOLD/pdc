import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ltiAgsService } from './lti.ags.js';
import type { LtiScore } from '@pdc/shared';

describe('ltiAgs Characterization Tests (W0-T8)', () => {
  const lineitemUrl = 'https://lms.com/api/lineitem/123';
  const accessToken = 'fake-jwt-token';
  const mockScore: LtiScore = {
    userId: 'user-456',
    scoreGiven: 8.5,
    scoreMaximum: 10,
    comment: 'Excelente desempenho no Oráculo.',
    timestamp: '2026-04-18T10:00:00Z',
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve enviar o score com sucesso (Happy Path 200 OK)', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'success' }), { status: 200 })
    );

    const result = await ltiAgsService.sendScore(lineitemUrl, mockScore, accessToken);

    expect(result).toEqual({ status: 'success' });
    expect(fetchSpy).toHaveBeenCalledWith(
      `${lineitemUrl}/scores`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.ims.lis.v1.score+json',
          Authorization: `Bearer ${accessToken}`,
        },
      })
    );
  });

  it('deve formatar a URL corretamente como ${lineitemUrl}/scores', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await ltiAgsService.sendScore(lineitemUrl, mockScore, accessToken);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/lms\.com\/api\/lineitem\/123\/scores$/),
      expect.any(Object)
    );
  });

  it('deve validar o envelope JSON enviado no corpo da requisição', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await ltiAgsService.sendScore(lineitemUrl, mockScore, accessToken);

    const callArgs = fetchSpy.mock.calls[0];
    const body = JSON.parse(callArgs?.[1]?.body as string);

    expect(body).toEqual({
      userId: mockScore.userId,
      scoreGiven: mockScore.scoreGiven,
      scoreMaximum: mockScore.scoreMaximum,
      comment: mockScore.comment,
      timestamp: mockScore.timestamp,
      activityProgress: mockScore.activityProgress,
      gradingProgress: mockScore.gradingProgress,
    });
  });

  it('deve lançar erro com status e body quando o LMS rejeita o score (4xx)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Invalid payload format', { status: 400, statusText: 'Bad Request' })
    );

    await expect(ltiAgsService.sendScore(lineitemUrl, mockScore, accessToken))
      .rejects.toThrow('Falha ao enviar score LTI AGS: 400 - Invalid payload format');
  });

  it('deve lançar erro quando o LMS está indisponível (5xx)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' })
    );

    await expect(ltiAgsService.sendScore(lineitemUrl, mockScore, accessToken))
      .rejects.toThrow('Falha ao enviar score LTI AGS: 503 - Service Unavailable');
  });

  it('deve lidar com falha de rede (Fetch Rejection)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'));

    await expect(ltiAgsService.sendScore(lineitemUrl, mockScore, accessToken))
      .rejects.toThrow('Network failure');
  });
});
