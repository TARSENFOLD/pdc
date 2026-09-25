/**
 * Generates a UUID v4 without assuming `crypto.randomUUID()` exists.
 *
 * Some Android WebViews expose Web Crypto but omit randomUUID(). We keep
 * randomUUID() as the fast path, fall back to getRandomValues(), and only use
 * Math.random() as a last-resort compatibility path for client-side IDs.
 */
export function createUuid(webCrypto: Crypto | undefined = globalThis.crypto): string {
  if (webCrypto && typeof webCrypto.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 / UUID v4 version and variant bits.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}
