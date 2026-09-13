import { z } from 'zod';

/** ~400 KB of base64 ≈ a 300 KB image; the client resizes well below this. */
const MAX_AVATAR_CHARS = 400_000;

const dataUrl = z
  .string()
  .max(MAX_AVATAR_CHARS, 'That image is too large — try a smaller one')
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Unsupported image format');

export const profileSchema = z.object({
  /** `null` clears the picture. */
  avatar: z.union([dataUrl, z.null()]),
});
