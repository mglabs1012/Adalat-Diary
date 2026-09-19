/**
 * The username and password rules, expressed without a validation library.
 *
 * The auth form used to import the Zod schemas directly so the client and the
 * server could not drift. That was the right instinct and the wrong mechanism:
 * it pulled Zod into the bundle of the two pages every visitor loads first,
 * and from there into the chunk shared by the whole app, to run four checks.
 *
 * The rules live here as plain constants and functions. The Zod schemas in
 * ./auth are built from these same constants, so there is still one source of
 * truth — the server simply remains the one that enforces it.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Letters, digits, dot, underscore and hyphen. No spaces, no @ — not an email. */
export const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export const CREDENTIAL_MESSAGES = {
  usernameShort: `Username must be at least ${USERNAME_MIN} characters`,
  usernameLong: `Username must be ${USERNAME_MAX} characters or fewer`,
  usernameChars: 'Use letters, numbers, dot, underscore or hyphen only',
  usernameMissing: 'Enter your username',
  passwordShort: `Password must be at least ${PASSWORD_MIN} characters`,
  passwordLong: `Password must be ${PASSWORD_MAX} characters or fewer`,
  passwordMissing: 'Enter your password',
} as const;

/** Usernames are stored lower-case and trimmed; normalise before comparing. */
export function normaliseUsername(value: string): string {
  return value.trim().toLowerCase();
}

export interface CredentialErrors {
  username?: string;
  password?: string;
}

/**
 * Signup rules. Login deliberately does not reuse them: enforcing a length
 * rule at sign-in would tell an attacker which passwords are even possible.
 */
export function checkSignup(username: string, password: string): CredentialErrors {
  const name = normaliseUsername(username);
  const errors: CredentialErrors = {};

  if (name.length < USERNAME_MIN) errors.username = CREDENTIAL_MESSAGES.usernameShort;
  else if (name.length > USERNAME_MAX) errors.username = CREDENTIAL_MESSAGES.usernameLong;
  else if (!USERNAME_PATTERN.test(name)) errors.username = CREDENTIAL_MESSAGES.usernameChars;

  if (password.length < PASSWORD_MIN) errors.password = CREDENTIAL_MESSAGES.passwordShort;
  else if (password.length > PASSWORD_MAX) errors.password = CREDENTIAL_MESSAGES.passwordLong;

  return errors;
}

export function checkLogin(username: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!normaliseUsername(username)) errors.username = CREDENTIAL_MESSAGES.usernameMissing;
  if (!password) errors.password = CREDENTIAL_MESSAGES.passwordMissing;
  return errors;
}
