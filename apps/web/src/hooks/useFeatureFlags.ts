import { useBootstrap } from '../lib/bootstrap/BootstrapContext.js';

export function useFeatureFlags() {
  const { data, isLoading } = useBootstrap();
  const flags = data?.capabilities?.features || {};

  /**
   * isEnabled (Fail-Safe)
   * No patamar mundial, se a flag não existe ou o sistema falha, 
   * a feature é DESATIVADA para proteger a experiência estável.
   */
  const isEnabled = (flag: string): boolean => {
    if (isLoading) return false;
    return !!flags[flag];
  };

  return { flags, isEnabled, isLoading };
}
