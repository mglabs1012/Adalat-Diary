/**
 * The CSV column contract.
 *
 * Deliberately free of imports so it can be read by the app, by the parser,
 * and by `scripts/generate-csv-prompt.mjs` — which turns it into the
 * hand-out document without anything being restated by hand and drifting.
 */

export interface ColumnSpec {
  /** The canonical header we print in the template. */
  header: string;
  key: string;
  required: boolean;
  /** Alternative spellings accepted on import. */
  aliases: string[];
  example: string;
  note?: string;
}

export const CSV_COLUMNS: readonly ColumnSpec[] = [
  { header: 'CRN', key: 'crn', required: false, aliases: ['case registration number', 'case ref', 'cnr'], example: 'DLCT01-004521-2026', note: 'Optional' },
  { header: 'Pre Date', key: 'preDate', required: false, aliases: ['previous date', 'prev date', 'last date'], example: '12/08/2026', note: 'Previous hearing' },
  { header: 'Court', key: 'court', required: true, aliases: ['forum'], example: 'ADJ1', note: 'Must be a court code' },
  { header: 'Party 1', key: 'party1', required: true, aliases: ['petitioner', 'plaintiff', 'party1'], example: 'John Doe' },
  { header: 'Party 2', key: 'party2', required: true, aliases: ['respondent', 'defendant', 'party2'], example: 'Jane Smith & Ors.' },
  { header: 'Stage', key: 'stage', required: false, aliases: [], example: 'Evidence', note: 'Codes like CR, PF, WS work' },
  { header: 'Next Date', key: 'nextDate', required: false, aliases: ['ndoh', 'next hearing'], example: '25/09/2026' },
  { header: 'Case No', key: 'caseNo', required: false, aliases: ['case number'], example: 'CS/412/2026' },
  { header: 'Court Room', key: 'courtRoom', required: false, aliases: ['room'], example: 'Court Room 5' },
  { header: 'Judge', key: 'judge', required: false, aliases: ['presiding judge'], example: 'Sh. R. K. Verma, ADJ' },
  { header: 'Listed For', key: 'purpose', required: false, aliases: ['purpose', 'for'], example: 'Cross examination' },
  { header: 'Client Name', key: 'clientName', required: false, aliases: ['client'], example: 'John Doe' },
  { header: 'Client Phone', key: 'clientPhone', required: false, aliases: ['phone', 'mobile'], example: '9876543210' },
  { header: 'Notes', key: 'notes', required: false, aliases: ['remarks'], example: 'Brief facts' },
] as const;

export const CSV_TEMPLATE = [
  CSV_COLUMNS.map((c) => c.header).join(','),
  CSV_COLUMNS.map((c) => (c.example.includes(',') ? `"${c.example}"` : c.example)).join(','),
].join('\n');

/** One request should not be able to insert a whole practice by accident. */
export const MAX_IMPORT_ROWS = 500;
