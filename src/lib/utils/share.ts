/**
 * Sharing, with an honest fallback.
 *
 * Android Chrome can hand a PDF straight to WhatsApp through the Web Share
 * API. Most desktop browsers cannot share files at all, so there we download
 * instead — which is what the user wanted anyway on a machine with a folder.
 */

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

function canShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof navigator.share === 'function' &&
    navigator.canShare({ files: [file] })
  );
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function sharePdf(
  blob: Blob,
  filename: string,
  title: string,
  text?: string,
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch (err) {
      // AbortError means the user closed the sheet — not a failure to report.
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      // Anything else (a share target that rejects files) falls through.
    }
  }

  download(blob, filename);
  return 'downloaded';
}

/** Plain-text share for a single record — the cause slip. */
export async function shareText(title: string, text: string): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'downloaded'; // copied, in this context
  } catch {
    return 'cancelled';
  }
}
