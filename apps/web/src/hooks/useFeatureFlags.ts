import { useQuery } from '@tanstack/react-query';
import { featureFlagsApi } from '../lib/api/feature-flags.js';

export function useFeatureFlags() {
  const { data: flags = {}, isLoading } = useQuery({
    queryKey: ['feature-flags', 'effective'],
    queryFn: () => featureFlagsApi.getEffective(),
    staleTime: 5 * 60 * 1000, 
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  /**
   * isEnabled (Fail-Safe)
   * No patamar mundial, se a flag não existe ou o sistema falha, 
   * a feature é DESATIVADA para proteger a experiência estável.
   */
  const isEnabled = (flag: string): boolean => {
    if (!flags) return false;
    return !!flags[flag];
  };

  return { flags, isEnabled, isLoading };
}
