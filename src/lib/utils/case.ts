import type { CaseRecord, PartySide } from '@/types/case';

/**
 * What to print where a CRN would go. A matter can be opened before the
 * registry issues one, so fall back to the case number and then to a plain
 * dash rather than rendering an empty chip.
 */
export function caseRef(c: Pick<CaseRecord, 'crn' | 'caseNo'>): string {
  return c.crn?.trim() || c.caseNo?.trim() || 'No CRN yet';
}

/** "Party 1 v. Party 2" — the cause title as it reads on a cause list. */
export function causeTitle(c: Pick<CaseRecord, 'party1' | 'party2'>): string {
  return `${c.party1} v. ${c.party2}`;
}

export function clientOf(c: CaseRecord): string {
  if (c.clientName) return c.clientName;
  return c.appearingFor === 'party2' ? c.party2 : c.party1;
}

export function sideLabel(side?: PartySide): string {
  return side === 'party2' ? 'Respondent' : 'Petitioner';
}

/** Text for the WhatsApp / share-sheet cause slip. */
export function causeSlip(
  c: Pick<CaseRecord, 'crn' | 'caseNo' | 'party1' | 'party2' | 'court' | 'courtRoom' | 'stage' | 'nextDate' | 'purpose'>,
  formatDate: (d?: string | null) => string,
): string {
  return [
    `${causeTitle(c)}`,
    c.crn ? `CRN: ${c.crn}${c.caseNo ? ` | ${c.caseNo}` : ''}` : c.caseNo ? `Case: ${c.caseNo}` : '',
    `Court: ${c.court}${c.courtRoom ? `, ${c.courtRoom}` : ''}`,
    `Stage: ${c.stage}`,
    `Next date: ${formatDate(c.nextDate)}`,
    c.purpose ? `For: ${c.purpose}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
