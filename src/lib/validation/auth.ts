import { z } from 'zod';

/** Letters, digits, dot, underscore and hyphen. No spaces, no @ — not an email. */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be 32 characters or fewer')
  .regex(/^[a-z0-9._-]+$/, 'Use letters, numbers, dot, underscore or hyphen only');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer');

export const signupSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

// Login stays permissive: length rules belong at signup, and enforcing them
// here would tell an attacker which passwords are even possible.
export const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, 'Enter your username').max(32),
  password: z.string().min(1, 'Enter your password').max(128),
});
