import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { redis } from '../../lib/redis.js';
import {
  AUTH_REVOCATION_BATCH_SIZE,
  TRUSTED_DEVICE_TTL_SECONDS,
} from './auth.constants.js';

function deviceKey(token: string): string {
  const hash = createHash('sha256').update(token).digest('hex');
  return `trusted_device:${hash}`;
}

function userDevicesKey(userId: string): string {
  return `user_trusted_devices:${userId}`;
}

const ISSUE_DEVICE_SCRIPT = `
redis.call("SET", KEYS[1], ARGV[1], "EX", ARGV[2])
redis.call("SADD", KEYS[2], KEYS[1])
redis.call("EXPIRE", KEYS[2], ARGV[2])
return 1
`;
const REVOKE_DEVICE_SCRIPT = `
redis.call("DEL", KEYS[1])
redis.call("SREM", KEYS[2], KEYS[1])
if redis.call("SCARD", KEYS[2]) == 0 then redis.call("DEL", KEYS[2]) end
return 1
`;
const REVOKE_DEVICE_BATCH_SCRIPT = `
local devices = redis.call("SPOP", KEYS[1], ARGV[1])
if not devices then return {0, 0} end
for _, deviceKey in ipairs(devices) do redis.call("DEL", deviceKey) end
local remaining = redis.call("SCARD", KEYS[1])
if remaining == 0 then redis.call("DEL", KEYS[1]) end
return {#devices, remaining}
`;
const RevocationBatchSchema = z.tuple([
  z.number().int().nonnegative(),
  z.number().int().nonnegative(),
]);

export const trustedDeviceService = {
  async issue(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const stored = await redis.eval<number>(
      ISSUE_DEVICE_SCRIPT,
      [deviceKey(token), userDevicesKey(userId)],
      [userId, TRUSTED_DEVICE_TTL_SECONDS],
    );
    if (stored !== 1) throw new Error('Falha ao persistir dispositivo confiável');
    return token;
  },

  async belongsToUser(token: string | undefined, userId: string): Promise<boolean> {
    if (!token) return false;
    const storedUserId = await redis.get<string>(deviceKey(token));
    return storedUserId === userId;
  },

  async revoke(token: string | undefined): Promise<void> {
    if (!token) return;
    const key = deviceKey(token);
    const userId = await redis.get<string>(key);
    if (!userId) return;
    await redis.eval<number>(REVOKE_DEVICE_SCRIPT, [key, userDevicesKey(userId)], []);
  },

  async revokeAll(userId: string): Promise<number> {
    let revoked = 0;
    for (;;) {
      const result = RevocationBatchSchema.parse(await redis.eval(
        REVOKE_DEVICE_BATCH_SCRIPT,
        [userDevicesKey(userId)],
        [AUTH_REVOCATION_BATCH_SIZE],
      ));
      revoked += result[0];
      if (result[1] === 0) return revoked;
      if (result[0] === 0) throw new Error('Revogação de dispositivos não progrediu');
    }
  },
};
