import { useQuery } from '@tanstack/react-query';
import { http } from '../lib/api/http';

/**
 * Fetch effective feature flags from the BFF.
 * Returns an empty object if the user is not authenticated or on error.
 */
export function useFeatureFlags() {
  const { data: flags = {} } = useQuery<Record<string, boolean>>({
    queryKey: ['feature-flags', 'effective'],
    queryFn: () =>
      http.get<Record<string, boolean>>('/feature-flags/effective').catch(() => ({})),
    staleTime: 60_000,
    retry: false,
  });

  return flags;
}
