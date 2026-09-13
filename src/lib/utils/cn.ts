type ClassValue = string | number | null | undefined | false | ClassValue[];

/** Tiny classnames joiner — no dependency, no runtime cost worth measuring. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const item of inputs) {
    if (!item) continue;
    if (Array.isArray(item)) {
      const nested = cn(...item);
      if (nested) out.push(nested);
    } else {
      out.push(String(item));
    }
  }
  return out.join(' ');
}
