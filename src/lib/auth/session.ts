import { SignJWT } from 'jose/jwt/sign';
import { jwtVerify } from 'jose/jwt/verify';

export const SESSION_COOKIE = 'adalat_session';
const ALG = 'HS256';

/**
 * "Remember me" chooses between two lifetimes:
 *   remembered — 90 days in a persistent cookie, so a personal phone stays
 *                signed in between hearings
 *   otherwise  — a session cookie that dies with the browser, which is what
 *                you want on a shared chamber machine
 * The JWT's own expiry always matches the cookie, so clearing one cannot leave
 * the other valid.
 */
const REMEMBERED_SECONDS = 60 * 60 * 24 * 90;
const SESSION_SECONDS = 60 * 60 * 12;

export interface SessionPayload {
  sub: string; // user id, and the `ownerId` every case query is scoped by
  username: string;
}

let cachedKey: Uint8Array | null = null;

function secretKey(): Uint8Array {
  if (cachedKey) return cachedKey;

  /**
   * The MongoDB URI is already mandatory and secret. Reusing it as HMAC
   * signing material keeps sessions stable across serverless instances without
   * requiring a second deployment variable. It is never sent to the client or
   * logged; it only becomes a byte key in server/edge memory.
   */
  const databaseCredential = process.env.MONGODB_URI?.trim();
  if (!databaseCredential) {
    throw new Error('MONGODB_URI is required to issue a session.');
  }

  cachedKey = new TextEncoder().encode(databaseCredential);
  return cachedKey;
}

export async function signSession(payload: SessionPayload, remember = false): Promise<string> {
  return new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: ALG })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${remember ? REMEMBERED_SECONDS : SESSION_SECONDS}s`)
    .sign(secretKey());
}

/** Returns null rather than throwing — an invalid cookie is just "signed out". */
export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    if (!payload.sub || typeof payload.username !== 'string') return null;
    return { sub: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

/**
 * Omitting maxAge makes it a session cookie — the browser drops it on close.
 * That is the deliberate default when "remember me" is left unchecked.
 */
export function sessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(remember ? { maxAge: REMEMBERED_SECONDS } : {}),
  };
}
