export const precisionTime = {
  /**
   * Retorna o timestamp em milissegundos com alta precisão.
   */
  now(): number {
    if (typeof performance !== 'undefined') {
      return performance.now() + performance.timeOrigin;
    }
    return Date.now();
  }
};
