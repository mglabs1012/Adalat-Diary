export const AVATAR_SIZE = 256;
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Centre-crops to a square, scales to 256px and re-encodes as JPEG.
 *
 * Done on the client deliberately: a 4 MB photo from a phone camera never
 * leaves the device, the upload is ~20 KB, and the server needs no image
 * library — which matters on a serverless function with a cold-start budget.
 */
export async function resizeToAvatar(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    throw new Error('Choose a JPG, PNG or WebP image.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That image is over 8 MB. Choose a smaller one.');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file could not be read as an image.');
  });

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Your browser could not process that image.');

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    if (!dataUrl.startsWith('data:image/jpeg;base64,')) {
      throw new Error('Your browser could not process that image.');
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
