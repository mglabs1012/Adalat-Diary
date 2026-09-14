/**
 * Writes docs/csv-import-prompt.md — the brief you hand to whoever is
 * preparing a CSV for import (a clerk, or an assistant you paste it into).
 *
 * Generated from the live constants rather than written by hand, so the court
 * codes and stage names in the document can never drift from the ones the
 * importer actually accepts.
 *
 *   npm run csv:prompt
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// These three modules are deliberately free of path aliases so node can load
// them directly with --experimental-strip-types.
const { COURT_GROUPS } = await import('../src/lib/constants/courts.ts');
const { STAGES, DEFAULT_STAGE } = await import('../src/lib/constants/stages.ts');
const { CSV_COLUMNS, MAX_IMPORT_ROWS } = await import('../src/lib/csv/columns.ts');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'Adalat Diary';

const required = CSV_COLUMNS.filter((c) => c.required);
const optional = CSV_COLUMNS.filter((c) => !c.required);

const columnRow = (c) =>
  `| \`${c.header}\` | ${c.required ? '**Yes**' : 'No'} | ${c.example} | ${c.note ?? ''} |`;

const stageLine = (s) =>
  s.aliases?.length ? `${s.label} _(also accepts: ${s.aliases.join(', ')})_` : s.label;

const doc = `# ${APP} — CSV import brief

Copy everything below this line and give it to whoever is preparing the file.

---

## Task

Produce a **CSV file** of court matters that can be imported into ${APP}.

One row per matter. The first row must be the header row. Save as UTF-8 CSV.

## Columns

Put the header names below in row 1. **Columns may be in any order**, casing does not
matter, and any column not listed here is ignored rather than treated as an error.

| Column | Required | Example | Notes |
| --- | --- | --- | --- |
${CSV_COLUMNS.map(columnRow).join('\n')}

Only **${required.map((c) => c.header).join(', ')}** must have a value in every row.
The other ${optional.length} may be left blank.

## Rules

1. **One matter per row.** Do not merge cells or leave a matter spanning two rows.
2. **Dates** may be written as \`25/09/2026\`, \`25-09-2026\` or \`2026-09-25\`. Day comes
   first in the slash and dash forms. Leave blank if not known — do not write "NA" or "-".
3. **Any value containing a comma must be wrapped in double quotes**, for example
   \`"Final arguments, part heard"\`. A double quote inside such a value is doubled: \`""\`.
4. **Court** must be one of the exact codes listed below. Spacing and case are forgiven
   (\`adj 1\` is read as \`ADJ1\`), but an unrecognised court is reported and the row skipped.
5. **Stage** must be one of the names below, or one of its accepted short codes.
   Blank means *${STAGES.find((s) => s.id === DEFAULT_STAGE)?.label}*.
6. **CRN is optional**, but where present it must be unique — the same CRN twice in one
   file is reported and the second occurrence skipped.
7. At most **${MAX_IMPORT_ROWS} rows** per file. Split larger registers into batches.
8. Do not add a totals row, a title row above the header, or blank separator rows.

## Court codes (${COURT_GROUPS.reduce((n, g) => n + g.courts.length, 0)})

${COURT_GROUPS.map((g) => `**${g.label}**\n\n${g.courts.map((c) => `\`${c}\``).join(' · ')}`).join('\n\n')}

## Stage names (${STAGES.length})

${STAGES.map((s) => `- ${stageLine(s)}`).join('\n')}

## Example

\`\`\`csv
${CSV_COLUMNS.map((c) => c.header).join(',')}
DLCT01-004521-2026,12/08/2026,ADJ1,John Doe,Jane Smith & Ors.,Evidence,25/09/2026,CS/412/2026,Court Room 5,"Sh. R. K. Verma, ADJ",Cross examination,John Doe,9876543210,Brief facts
,05-08-2026,KEKRI-ACJM1,State,Vikram Singh,CR,25/09/2026,,,,"Arguments, part heard",,,
BWR-0099-2026,,BEAWAR-NI,Acme Pvt Ltd,R. Sharma,PF,02/10/2026,NI/88/2026,,,Service,,9812345678,
\`\`\`

Row 2 uses every column. Row 3 has no CRN and uses the short code \`CR\` for Cheque Report,
with a quoted value containing a comma. Row 4 uses \`PF\` for Process Fee and leaves several
optional columns empty.

## What happens on import

The file is checked before anything is saved. You are shown how many rows are ready and how
many have problems, with the **line number and reason** for each problem row — a missing
party, an unreadable date, an unknown court, a CRN repeated within the file. Only the good
rows are imported; the rest are listed so they can be corrected and re-imported.

---

_Generated from the app's own court and stage lists on ${new Date().toISOString().slice(0, 10)}. Regenerate with \`npm run csv:prompt\`._
`;

mkdirSync(resolve(ROOT, 'docs'), { recursive: true });
writeFileSync(resolve(ROOT, 'docs/csv-import-prompt.md'), doc);

console.log('docs/csv-import-prompt.md');
console.log(`  ${CSV_COLUMNS.length} columns · ${COURT_GROUPS.reduce((n, g) => n + g.courts.length, 0)} courts · ${STAGES.length} stages`);
