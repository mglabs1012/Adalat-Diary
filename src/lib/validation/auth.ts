import { z } from 'zod';
import {
  CREDENTIAL_MESSAGES,
  PASSWORD_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  USERNAME_MIN,
  USERNAME_PATTERN,
} from './credentials';

/**
 * The server's copy of the credential rules.
 *
 * Built from the constants in ./credentials so it cannot drift from what the
 * form checks, while keeping Zod itself on the server — see that file for why
 * that separation is worth having.
 */

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(USERNAME_MIN, CREDENTIAL_MESSAGES.usernameShort)
  .max(USERNAME_MAX, CREDENTIAL_MESSAGES.usernameLong)
  .regex(USERNAME_PATTERN, CREDENTIAL_MESSAGES.usernameChars);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, CREDENTIAL_MESSAGES.passwordShort)
  .max(PASSWORD_MAX, CREDENTIAL_MESSAGES.passwordLong);

/** Keep this device signed in. Defaults off — safer on a shared machine. */
const rememberSchema = z.boolean().optional().default(false);

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  remember: rememberSchema,
});

// Login stays permissive: length rules belong at signup, and enforcing them
// here would tell an attacker which passwords are even possible.
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, CREDENTIAL_MESSAGES.usernameMissing).max(USERNAME_MAX),
  password: z.string().min(1, CREDENTIAL_MESSAGES.passwordMissing).max(PASSWORD_MAX),
  remember: rememberSchema,
});
