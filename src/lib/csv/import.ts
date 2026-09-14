import { CSV_COLUMNS } from './columns';
import { matchCourt } from '@/lib/constants/courts';
import { DEFAULT_STAGE, STAGES, type StageMeta } from '@/lib/constants/stages';
import type { StageId } from '@/types/case';

/**
 * CSV import for an advocate moving off a spreadsheet.
 *
 * Deliberately forgiving about *shape* and strict about *meaning*: headers can
 * arrive in any order and any casing, dates in any of the four formats Indian
 * chambers actually use, stages by label or id, courts by code — but a row
 * missing a party, or naming a court that does not exist, is reported rather
 * than guessed at.
 */

/* ── Parsing ──────────────────────────────────────────────────────────────── */

/** RFC 4180: quoted fields may contain commas, newlines and doubled quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  // Strip a UTF-8 BOM — Excel adds one and it corrupts the first header.
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);

  return rows;
}

const normalise = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

/** Maps whatever headers the file has onto our keys. */
export function mapHeaders(header: string[]): { index: Record<string, number>; unknown: string[] } {
  const index: Record<string, number> = {};
  const unknown: string[] = [];

  header.forEach((raw, i) => {
    const cell = normalise(raw);
    if (!cell) return;
    const spec = CSV_COLUMNS.find(
      (c) => normalise(c.header) === cell || c.aliases.some((a) => normalise(a) === cell),
    );
    if (spec) index[spec.key] = i;
    else unknown.push(raw.trim());
  });

  return { index, unknown };
}

/** dd/MM/yyyy, dd-MM-yyyy, yyyy-MM-dd and "12 Aug 2026" all appear in practice. */
export function parseDate(input: string): { iso: string | null; error?: string } {
  const value = input.trim();
  if (!value) return { iso: null };

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { iso: `${iso[1]}-${iso[2]}-${iso[3]}` };

  const dmy = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const month = Number(m);
    const day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { iso: null, error: `"${value}" is not a real date` };
    }
    return { iso: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` };
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    const m = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const d = `${parsed.getDate()}`.padStart(2, '0');
    return { iso: `${parsed.getFullYear()}-${m}-${d}` };
  }

  return { iso: null, error: `Could not read the date "${value}"` };
}

const STAGE_LOOKUP = new Map<string, StageId>();
for (const s of STAGES as readonly StageMeta[]) {
  STAGE_LOOKUP.set(normalise(s.id), s.id);
  STAGE_LOOKUP.set(normalise(s.label), s.id);
  STAGE_LOOKUP.set(normalise(s.short), s.id);
  // The register is kept in short codes — CR, PF, WS — so accept those too.
  for (const alias of s.aliases ?? []) STAGE_LOOKUP.set(normalise(alias), s.id);
}

export function parseStage(input: string): StageId | null {
  const value = normalise(input);
  if (!value) return DEFAULT_STAGE;
  return STAGE_LOOKUP.get(value) ?? null;
}

export interface ImportRow {
  /** 1-based line number in the file, header included — what the user sees. */
  line: number;
  data: Record<string, string | null>;
  errors: string[];
}

export interface ParsedCsv {
  rows: ImportRow[];
  unknownColumns: string[];
  missingRequired: string[];
  valid: ImportRow[];
  invalid: ImportRow[];
}

export function parseImportFile(text: string): ParsedCsv {
  const table = parseCsv(text);
  if (!table.length) {
    return { rows: [], unknownColumns: [], missingRequired: [], valid: [], invalid: [] };
  }

  const [header, ...body] = table;
  const { index, unknown } = mapHeaders(header);

  const missingRequired = CSV_COLUMNS.filter((c) => c.required && index[c.key] === undefined).map(
    (c) => c.header,
  );

  const rows: ImportRow[] = body.map((cells, i) => {
    const errors: string[] = [];
    const at = (key: string) => (index[key] === undefined ? '' : (cells[index[key]] ?? '').trim());

    const data: Record<string, string | null> = {};

    for (const col of CSV_COLUMNS) {
      if (col.key === 'preDate' || col.key === 'nextDate' || col.key === 'stage') continue;
      const value = at(col.key);
      if (col.required && !value) errors.push(`${col.header} is required`);
      data[col.key] = value || null;
    }

    for (const key of ['preDate', 'nextDate'] as const) {
      const { iso, error } = parseDate(at(key));
      if (error) errors.push(error);
      data[key] = iso;
    }

    const rawCourt = at('court');
    if (rawCourt) {
      const court = matchCourt(rawCourt);
      if (court) data.court = court;
      else errors.push(`"${rawCourt}" is not a court on the list`);
    }

    const rawStage = at('stage');
    const stage = parseStage(rawStage);
    if (stage === null) errors.push(`Unknown stage "${rawStage}"`);
    data.stage = stage ?? DEFAULT_STAGE;

    if (data.preDate && data.nextDate && data.nextDate < data.preDate) {
      errors.push('Next date falls before the previous date');
    }

    return { line: i + 2, data, errors };
  });

  // A CRN repeated inside the same file would fail the unique index anyway;
  // catching it here lets us say which two lines clash.
  const seen = new Map<string, number>();
  for (const row of rows) {
    const crn = (row.data.crn ?? '').toUpperCase();
    if (!crn) continue; // a blank CRN cannot duplicate anything
    const first = seen.get(crn);
    if (first) row.errors.push(`Duplicate of line ${first} in this file`);
    else seen.set(crn, row.line);
  }

  return {
    rows,
    unknownColumns: unknown,
    missingRequired,
    valid: rows.filter((r) => !r.errors.length),
    invalid: rows.filter((r) => r.errors.length),
  };
}
