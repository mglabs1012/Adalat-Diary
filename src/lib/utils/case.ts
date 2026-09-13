import type { CaseRecord, PartySide } from '@/types/case';

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
export function causeSlip(c: CaseRecord, formatDate: (d?: string | null) => string): string {
  return [
    `${causeTitle(c)}`,
    `CRN: ${c.crn}${c.caseNo ? ` | ${c.caseNo}` : ''}`,
    `Court: ${c.court}${c.courtRoom ? `, ${c.courtRoom}` : ''}`,
    `Stage: ${c.stage}`,
    `Next date: ${formatDate(c.nextDate)}`,
    c.purpose ? `For: ${c.purpose}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
