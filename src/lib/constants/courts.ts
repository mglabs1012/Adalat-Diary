/**
 * The court establishments this chamber practises in.
 *
 * Values are the codes exactly as the registry writes them — they are what
 * gets stored on the record and printed on a cause list, so they are not
 * prettified. The grouping is purely for the dropdown: 93 flat options are
 * unusable, 93 options under ten headings are not.
 */

export interface CourtGroup {
  label: string;
  courts: readonly string[];
}

export const COURT_GROUPS: readonly CourtGroup[] = [
  {
    label: 'Ajmer — District Headquarters',
    courts: [
      'DJ',
      'ADJ1',
      'ADJ2',
      'ADJ3',
      'ADJ4',
      'ADJ5',
      'ADR',
      'ADM',
      'AT',
      'WA',
      'WA-DC',
      'SC-ST',
      'LABOUR',
      'ACD',
      'CJM',
      'ACJM1',
      'ACJM2',
      'ACJM3',
      'ACJ1',
      'ACJ2',
      'ACJ3',
      'ACJ4',
      'ACJ5',
      'ACJ6',
      'JM1',
      'JM2',
      'JM3',
      'JM4',
      'NI1',
      'NI2',
      'NI3',
      'NI4',
      'CC',
      'CF',
      'MS',
      'MN',
      'MD',
      'ME',
      'RT',
      'RA',
      'POCSO1',
      'POCSO2',
      'COMMERCIAL',
      'MACT',
      'FAMILY1',
      'FAMILY2',
      'PCPNDT',
      'RAILWAY',
      'DESIGNATED-COURT',
      'JJB',
      'CJ-JM-DISTRICT',
      'CJ-JM-EAST',
      'CJ-JM-WEST',
      'CJ-JM-NORTH',
      'CJ-JM-SOUTH',
      'ACJ-JM1',
      'ACJ-JM2',
      'ACJ-JM3',
      'ACJ-JM4',
      'ACJ-JM5',
      'ACJ-JM6',
    ],
  },
  {
    label: 'Kishangarh',
    courts: [
      'KISHANGARH-ADJ1',
      'KISHANGARH-ADJ2',
      'KISHANGARH-ACJM1',
      'KISHANGARH-ACJM2',
      'KISHANGARH-CJ-JM',
      'KISHANGARH-ACJ-JM',
      'KISHANGARH-NI',
    ],
  },
  {
    label: 'Nasirabad',
    courts: ['NASIRABAD-ADJ', 'NASIRABAD-ACJM', 'NASIRABAD-CJ-JM'],
  },
  {
    label: 'Beawar',
    courts: [
      'BEAWAR-ADJ1',
      'BEAWAR-ADJ2',
      'BEAWAR-ADJ3',
      'BEAWAR-ACJM',
      'BEAWAR-ACJM1',
      'BEAWAR-ACJM2',
      'BEAWAR-ACJM3',
      'BEAWAR-CJ-JM',
      'BEAWAR-ACJ-JM1',
      'BEAWAR-ACJ-JM2',
      'BEAWAR-ACJ-JM3',
      'BEAWAR-NI',
    ],
  },
  {
    label: 'Kekri',
    courts: ['KEKRI-ADJ1', 'KEKRI-ADJ2', 'KEKRI-ACJM1', 'KEKRI-ACJM2', 'KEKRI-CJ-JM'],
  },
  {
    label: 'Other tehsils',
    courts: [
      'PUSHKAR-CJ-JM',
      'PISANGAN-GRAM-NYAYALAYA',
      'SARWAR-CJ-JM',
      'MASUDA-CJ-JM',
      'BIJAYNAGAR-CJ-JM',
    ],
  },
] as const;

/** Flat list, for validation and for the CSV importer. */
export const COURTS: readonly string[] = COURT_GROUPS.flatMap((g) => g.courts);

const COURT_SET = new Set(COURTS);

export function isKnownCourt(value: string): boolean {
  return COURT_SET.has(value.trim().toUpperCase());
}

/**
 * Matches a CSV cell to a court code, tolerating case and stray spacing.
 * Returns null when there is no match, so the importer can report the row
 * rather than silently filing it in the wrong court.
 */
export function matchCourt(value: string): string | null {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, '');
  if (COURT_SET.has(cleaned)) return cleaned;

  // "ADJ 1" and "ADJ-1" both mean ADJ1.
  const collapsed = cleaned.replace(/[^A-Z0-9]/g, '');
  const hit = COURTS.find((c) => c.replace(/[^A-Z0-9]/g, '') === collapsed);
  return hit ?? null;
}

export const PURPOSE_SUGGESTIONS = [
  'Hearing',
  'Filing of reply',
  'Evidence',
  'Cross examination',
  'Arguments',
  'Final arguments',
  'Orders',
  'Mention',
  'Compliance',
  'Settlement / Mediation',
] as const;
