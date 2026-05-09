import { describe, expect, it } from 'vitest';
import { validateMagicBytes } from './file-type-guard.js';

const jpegBytes = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
]);

describe('validateMagicBytes', () => {
  it('aceita quando o MIME declarado corresponde aos magic bytes', async () => {
    await expect(validateMagicBytes(jpegBytes, 'image/jpeg')).resolves.toEqual({ ok: true });
  });

  it('rejeita quando o MIME declarado diverge do tipo detectado', async () => {
    const result = await validateMagicBytes(Buffer.from('%PDF-1.7\n'), 'image/jpeg');

    expect(result).toEqual({
      ok: false,
      code: 'MIME_MISMATCH',
      reason: 'Tipo detectado application/pdf não corresponde a image/jpeg declarado',
      detectedMime: 'application/pdf',
    });
  });

  it('rejeita MIME declarado fora da whitelist', async () => {
    const result = await validateMagicBytes(Buffer.from('plain text'), 'text/plain');

    expect(result).toEqual({
      ok: false,
      code: 'TYPE_NOT_ALLOWED',
      reason: 'Tipo declarado text/plain não é permitido',
    });
  });
});
