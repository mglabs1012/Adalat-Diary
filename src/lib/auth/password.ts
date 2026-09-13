import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;
const SALT_LEN = 16;
const PREFIX = 'scrypt';

/**
 * Password hashing on node:crypto's scrypt — memory-hard, in the standard
 * library, and no native build step. Deliberately not bcrypt: adding a
 * dependency (and on some platforms a compiler) buys nothing here.
 *
 * Stored form: `scrypt$<base64 salt>$<base64 key>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LEN);
  return `${PREFIX}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split('$');
  if (scheme !== PREFIX || !saltB64 || !keyB64) return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(keyB64, 'base64');
  if (expected.length !== KEY_LEN) return false;

  const actual = await scrypt(password.normalize('NFKC'), salt, KEY_LEN);
  return timingSafeEqual(actual, expected);
}

/**
 * Burn roughly the same time on a missing username as on a wrong password, so
 * the response time does not reveal which accounts exist.
 */
export async function fakeVerify(): Promise<void> {
  await scrypt('decoy', randomBytes(SALT_LEN), KEY_LEN);
}
