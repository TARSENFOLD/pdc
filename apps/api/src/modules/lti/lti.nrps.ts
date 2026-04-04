export const ltiNrps = {
  async getMemberships(nrpsUrl: string, accessToken: string) {
    const res = await fetch(nrpsUrl, {
      headers: {
        Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Falha ao obter memberships LTI NRPS: ${res.status.toString()} - ${error}`);
    }

    const data = await res.json() as { members?: unknown[] };
    return data.members ?? [];
  },
};
