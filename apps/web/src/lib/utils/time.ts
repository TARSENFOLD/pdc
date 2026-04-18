export const precisionTime = {
  /**
   * Retorna o timestamp em milissegundos com alta precisão.
   */
  now(): number {
    if (typeof window !== 'undefined' && window.performance) {
      return window.performance.now() + window.performance.timeOrigin;
    }
    return Date.now();
  }
};
