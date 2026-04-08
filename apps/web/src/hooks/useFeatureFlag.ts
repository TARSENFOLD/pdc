import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/api/http';
import { useAuth } from '@/lib/auth/AuthContext';

interface FeatureFlagsOptions {
  instituicaoId?: number;
}

function useFeatureFlags(opts?: FeatureFlagsOptions) {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['feature-flags', 'effective', user?.role, opts?.instituicaoId],
    queryFn: () => {
      const params = new URLSearchParams({ perfilTipo: user?.role ?? 'aluno' });
      if (opts?.instituicaoId != null) {
        params.set('instituicaoId', String(opts.instituicaoId));
      }
      return http.get<Record<string, boolean>>(`/feature-flags/effective?${params.toString()}`);
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useFeatureFlag(domain: string, opts?: FeatureFlagsOptions): boolean {
  const { data: flags } = useFeatureFlags(opts);
  // Invariant: flag absent = disabled
  return flags?.[domain] === true;
}
