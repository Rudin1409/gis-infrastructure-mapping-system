import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';

const COST = 131072;
const KEY_BYTES = 64;
let activeDerivations = 0;

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (activeDerivations >= 2) {
      reject(new Error('Password service busy'));
      return;
    }
    activeDerivations++;
    scrypt(
      password,
      salt,
      KEY_BYTES,
      { N: COST, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
      (error, key) => {
        activeDerivations--;
        return error ? reject(error) : resolve(key);
      }
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(stored)) return false;
  const [, salt, digest] = stored.split('$');
  return timingSafeEqual(await derive(password, salt), Buffer.from(digest, 'hex'));
}

export function digestToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
