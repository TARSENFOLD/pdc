import { fileTypeFromBuffer } from 'file-type/core';

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
]);

export type MagicByteValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: 'MIME_MISMATCH' | 'TYPE_NOT_ALLOWED';
      reason: string;
      detectedMime?: string;
    };

export async function validateMagicBytes(
  buffer: Buffer,
  declaredMime: string
): Promise<MagicByteValidationResult> {
  if (!ALLOWED_MEDIA_MIME_TYPES.has(declaredMime)) {
    return {
      ok: false,
      code: 'TYPE_NOT_ALLOWED',
      reason: `Tipo declarado ${declaredMime} não é permitido`,
    };
  }

  const detected = await fileTypeFromBuffer(buffer.subarray(0, 4100));

  if (!detected) {
    return {
      ok: false,
      code: 'TYPE_NOT_ALLOWED',
      reason: `Não foi possível detectar o tipo real do ficheiro declarado como ${declaredMime}`,
    };
  }

  if (!ALLOWED_MEDIA_MIME_TYPES.has(detected.mime)) {
    return {
      ok: false,
      code: 'TYPE_NOT_ALLOWED',
      reason: `Tipo detectado ${detected.mime} não é permitido`,
      detectedMime: detected.mime,
    };
  }

  if (detected.mime !== declaredMime) {
    return {
      ok: false,
      code: 'MIME_MISMATCH',
      reason: `Tipo detectado ${detected.mime} não corresponde a ${declaredMime} declarado`,
      detectedMime: detected.mime,
    };
  }

  return { ok: true };
}
