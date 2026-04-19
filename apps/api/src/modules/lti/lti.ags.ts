import type { LtiScore } from '@pdc/shared';

export const ltiAgsService = {
  async sendScore(lineitemUrl: string, score: LtiScore, accessToken: string) {
    const res = await fetch(`${lineitemUrl}/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        userId: score.userId,
        scoreGiven: score.scoreGiven,
        scoreMaximum: score.scoreMaximum,
        comment: score.comment,
        timestamp: score.timestamp,
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Falha ao enviar score LTI AGS: ${res.status.toString()} - ${error}`);
    }

    return res.json();
  },
};
