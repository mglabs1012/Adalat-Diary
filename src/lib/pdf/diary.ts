import type { DiaryDayEntry, DiaryDayGroup } from '@/lib/data/diaryDays';
import type { CaseRecord } from '@/types/case';
import { getStage } from '@/lib/constants/stages';
import { caseRef, causeTitle } from '@/lib/utils/case';
import { formatDate, formatLongDate } from '@/lib/utils/date';

/**
 * Cause-list and case-sheet PDFs, drawn to match the app: the same navy
 * header, the same legal ochre accent, the same tabular figures.
 *
 * jsPDF is imported lazily inside each builder. It is ~350 KB and almost no
 * session prints anything, so it must not sit in the first-load bundle.
 */

// The app palette, as RGB triplets.
const NAVY: [number, number, number] = [26, 43, 73];
const NAVY_DEEP: [number, number, number] = [11, 31, 51];
const GOLD: [number, number, number] = [254, 195, 66];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [90, 99, 117];
const HAIRLINE: [number, number, number] = [205, 211, 224];
const ZEBRA: [number, number, number] = [244, 246, 251];
const DAY_BAND: [number, number, number] = [233, 238, 248];

const MARGIN = 14;
const HEADER_H = 24;
const CONTENT_TOP = HEADER_H + 9;
const FOOTER_H = 16;

export interface PdfMeta {
  /** The chamber this was generated for — the signed-in username. */
  chamber: string;
  appName: string;
}

type Doc = import('jspdf').jsPDF;

/**
 * Page geometry, read off the document rather than assumed, so the landscape
 * cause lists and the portrait case sheet share every drawing routine.
 */
function box(doc: Doc) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  return { width, height, footerTop: height - FOOTER_H, content: width - MARGIN * 2 };
}

async function loadPdf() {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableModule.default ?? autoTableModule) as unknown as (
    doc: Doc,
    options: Record<string, unknown>,
  ) => void;
  return { jsPDF, autoTable };
}

/** Header band and footer are painted after all content, once per page. */
function paintChrome(doc: Doc, title: string, subtitle: string, meta: PdfMeta) {
  const pages = doc.getNumberOfPages();
  const generated = new Date();

  const stamp = `${formatDate(generated)} at ${generated.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    const { width, footerTop } = box(doc);

    // ── Header band ──────────────────────────────────────────────────────
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, width, HEADER_H, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, HEADER_H, width, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.text(meta.appName, MARGIN, 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...GOLD);
    doc.text('COURT DIARY', MARGIN, 15.8, { charSpace: 0.8 });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(title, width - MARGIN, 10.5, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(196, 211, 236);
    doc.text(subtitle, width - MARGIN, 15.8, { align: 'right' });

    // ── Footer ───────────────────────────────────────────────────────────
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, footerTop, width - MARGIN, footerTop);

    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED);
    doc.text(`${meta.appName} · @${meta.chamber}`, MARGIN, footerTop + 5);
    doc.text(`Generated ${stamp}`, width / 2, footerTop + 5, { align: 'center' });
    doc.text(`Page ${page} of ${pages}`, width - MARGIN, footerTop + 5, { align: 'right' });
  }
}

const tableTheme = {
  theme: 'grid' as const,
  styles: {
    font: 'helvetica',
    fontSize: 8,
    cellPadding: { top: 2, right: 1.8, bottom: 2, left: 1.8 },
    textColor: INK,
    lineColor: HAIRLINE,
    lineWidth: 0.15,
    overflow: 'linebreak' as const,
    valign: 'middle' as const,
  },
  headStyles: {
    fillColor: NAVY_DEEP,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 7.2,
    cellPadding: { top: 2.4, right: 1.8, bottom: 2.4, left: 1.8 },
    lineColor: NAVY_DEEP,
  },
  alternateRowStyles: { fillColor: ZEBRA },
  // A row never splits across a page. Without this a three-line cause title
  // landing at the foot of a page leaves its last line stranded at the top of
  // the next one, under a repeated header and with every other cell blank.
  rowPageBreak: 'avoid' as const,
  margin: { top: CONTENT_TOP, bottom: FOOTER_H + 7, left: MARGIN, right: MARGIN },
};

/**
 * The cause-list columns: the register's own, in the register's own order.
 *
 * Two are added at the end rather than substituted in. A day's page carries
 * matters that were heard on it and have since been adjourned as well as
 * matters still listed for it, so `Status` says which a row is; `Listed For`
 * is the purpose, which is most of why the list gets read at all.
 */
const COLUMNS = [
  { header: 'Sr No', dataKey: 'sr' },
  { header: 'CRN', dataKey: 'crn' },
  { header: 'Pre Date', dataKey: 'preDate' },
  { header: 'Court', dataKey: 'court' },
  { header: 'Party 1', dataKey: 'party1' },
  { header: 'Party 2', dataKey: 'party2' },
  { header: 'Stage', dataKey: 'stage' },
  { header: 'Next Date', dataKey: 'nextDate' },
  { header: 'Status', dataKey: 'status' },
  { header: 'Listed For', dataKey: 'purpose' },
];

/**
 * Landscape A4 leaves 269mm between the margins. The fixed widths below come
 * to 240mm, which leaves 29mm for the single 'auto' column.
 */
const COLUMN_STYLES: Record<string, Record<string, unknown>> = {
  sr: { cellWidth: 10, halign: 'center', textColor: MUTED, fontSize: 7.5 },
  crn: { cellWidth: 30, fontStyle: 'bold', fontSize: 7.5 },
  preDate: { cellWidth: 20, halign: 'center', fontSize: 7.5 },
  // Wide enough, at 7pt, that the longest code in the list —
  // PISANGAN-GRAM-NYAYALAYA — fits on two lines split at its own hyphen,
  // rather than autoTable adding a third line holding just a hyphen.
  court: { cellWidth: 28, fontSize: 7 },
  party1: { cellWidth: 44 },
  party2: { cellWidth: 44 },
  stage: { cellWidth: 29, fontSize: 7.5 },
  nextDate: { cellWidth: 20, halign: 'center', fontStyle: 'bold', fontSize: 7.5 },
  status: { cellWidth: 15, halign: 'center', fontSize: 7, textColor: MUTED },
  purpose: { cellWidth: 'auto', fontSize: 7.5 },
};

/**
 * Court codes are single hyphenated tokens, and the longest of them —
 * PISANGAN-GRAM-NYAYALAYA — is wider than any column that can sit beside
 * seven others. autoTable only breaks on spaces, so it would split one
 * through the middle of a word. Breaking at the hyphen nearest the centre
 * keeps the code legible and the column narrow.
 */
function wrapCourt(code: string): string {
  if (code.length <= 13) return code;
  const hyphens = [...code.matchAll(/-/g)].map((m) => m.index ?? 0);
  if (!hyphens.length) return code;

  const middle = code.length / 2;
  const at = hyphens.reduce(
    (best, i) => (Math.abs(i - middle) < Math.abs(best - middle) ? i : best),
    hyphens[0],
  );
  return `${code.slice(0, at + 1)}\n${code.slice(at + 1)}`;
}

function rows(entries: readonly DiaryDayEntry[]) {
  return entries.map(({ record: c, role }, i) => ({
    sr: i + 1,
    crn: c.crn || '—',
    preDate: c.preDate ? formatDate(c.preDate) : '—',
    court: c.courtRoom ? `${wrapCourt(c.court)}\n${c.courtRoom}` : wrapCourt(c.court),
    party1: c.party1,
    party2: c.party2,
    stage: getStage(c.stage).label,
    nextDate: c.nextDate ? formatDate(c.nextDate) : 'Awaited',
    status: c.status === 'disposed' ? 'Disposed' : role === 'listed' ? 'Listed' : 'Heard',
    purpose: c.purpose || '—',
  }));
}

/** "4 matters · 2 listed · 2 already heard" — the day's shape, in the header. */
function tally(entries: readonly DiaryDayEntry[]): string {
  const listed = entries.filter((e) => e.role === 'listed').length;
  const heard = entries.length - listed;
  const parts = [`${entries.length} matter${entries.length === 1 ? '' : 's'}`];
  if (listed && heard) parts.push(`${listed} listed`, `${heard} already heard`);
  return parts.join(' · ');
}

function emptyNote(doc: Doc, text: string, y: number) {
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(text, box(doc).width / 2, y, { align: 'center' });
}

/** Cause lists are landscape; only the single-case sheet stays portrait. */
function landscape(jsPDF: typeof import('jspdf').jsPDF): Doc {
  return new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
}

function fileSafe(text: string) {
  return text.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

/* ── Day cause list ───────────────────────────────────────────────────────── */

export async function buildDayPdf(
  entries: readonly DiaryDayEntry[],
  date: Date,
  meta: PdfMeta,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = landscape(jsPDF);

  if (entries.length) {
    autoTable(doc, {
      ...tableTheme,
      startY: CONTENT_TOP,
      columns: COLUMNS,
      body: rows(entries),
      columnStyles: COLUMN_STYLES,
    });
  } else {
    emptyNote(doc, 'No matter was listed or heard on this date.', CONTENT_TOP + 14);
  }

  paintChrome(doc, 'Cause list', `${formatLongDate(date)} · ${tally(entries)}`, meta);

  return {
    blob: doc.output('blob'),
    filename: `cause-list-${fileSafe(formatDate(date))}.pdf`,
  };
}

/* ── Month diary ──────────────────────────────────────────────────────────── */

const MONTH_FMT = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

/**
 * One table per day, in date order, each under its own heading — which is what
 * makes a month readable. A single 200-row table would be useless.
 */
export async function buildMonthPdf(
  groups: readonly DiaryDayGroup[],
  month: Date,
  meta: PdfMeta,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = landscape(jsPDF);
  const { width, footerTop, content } = box(doc);

  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  let cursor = CONTENT_TOP;

  if (!groups.length) {
    emptyNote(doc, 'No matter was listed or heard in this month.', cursor + 14);
  }

  groups.forEach((group, i) => {
    const headingH = 9;
    // Keep a day heading with its table header and at least one full row —
    // a heading alone at the foot of a page is worse than a short page.
    if (i > 0 && cursor + headingH + 26 > footerTop - 6) {
      doc.addPage();
      cursor = CONTENT_TOP;
    }

    doc.setFillColor(...DAY_BAND);
    doc.roundedRect(MARGIN, cursor, content, headingH, 1.5, 1.5, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(MARGIN, cursor, 1.6, headingH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(formatLongDate(group.date), MARGIN + 4.5, cursor + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(tally(group.entries), width - MARGIN - 3, cursor + 6, { align: 'right' });

    cursor += headingH + 2;

    autoTable(doc, {
      ...tableTheme,
      startY: cursor,
      columns: COLUMNS,
      body: rows(group.entries),
      columnStyles: COLUMN_STYLES,
    });

    // autoTable records where it stopped, including any page it broke onto.
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    cursor = (finalY ?? cursor) + 7;
  });

  paintChrome(
    doc,
    'Monthly diary',
    `${MONTH_FMT.format(month)} · ${groups.length} day${groups.length === 1 ? '' : 's'} · ${total} matter${total === 1 ? '' : 's'}`,
    meta,
  );

  return {
    blob: doc.output('blob'),
    filename: `diary-${fileSafe(MONTH_FMT.format(month))}.pdf`,
  };
}

/* ── Single case sheet ────────────────────────────────────────────────────── */

/** A one-page brief for a single matter — what you hand to a junior or a client. */
export async function buildCasePdf(
  record: CaseRecord,
  meta: PdfMeta,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { content, footerTop } = box(doc);

  let cursor = CONTENT_TOP;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  const title = doc.splitTextToSize(causeTitle(record), content) as string[];
  doc.text(title, MARGIN, cursor);
  cursor += title.length * 6.5 + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    [record.crn, record.caseNo, getStage(record.stage).label].filter(Boolean).join('  ·  ') ||
      getStage(record.stage).label,
    MARGIN,
    cursor,
  );
  cursor += 8;

  // Named exactly as the cause list names them, so the two read as one set
  // of records rather than two different vocabularies.
  const detail: [string, string][] = [
    ['CRN', record.crn || '—'],
    ['Case number', record.caseNo ?? '—'],
    ['Court', record.courtRoom ? `${record.court} · ${record.courtRoom}` : record.court],
    ['Presiding judge', record.judge ?? '—'],
    ['Party 1', record.party1],
    ['Party 2', record.party2],
    ['Stage', getStage(record.stage).label],
    ['Pre Date', record.preDate ? formatDate(record.preDate) : '—'],
    [
      'Next Date',
      record.status === 'disposed'
        ? 'Disposed'
        : record.nextDate
          ? formatDate(record.nextDate)
          : 'Awaited',
    ],
    ['Listed for', record.purpose ?? '—'],
    ['Appearing for', record.appearingFor === 'party2' ? 'Party 2' : 'Party 1'],
    ['Client', record.clientName ?? '—'],
    ['Client phone', record.clientPhone ?? '—'],
  ];

  autoTable(doc, {
    ...tableTheme,
    startY: cursor,
    body: detail.map(([label, value]) => ({ label, value })),
    columns: [
      { header: 'Field', dataKey: 'label' },
      { header: 'Detail', dataKey: 'value' },
    ],
    columnStyles: {
      label: { cellWidth: 42, fontStyle: 'bold', fillColor: ZEBRA },
      value: { cellWidth: 'auto' },
    },
    alternateRowStyles: {},
  });

  cursor = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursor) + 9;

  if (record.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text('Chamber notes', MARGIN, cursor);
    cursor += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const notes = doc.splitTextToSize(record.notes, content) as string[];
    doc.text(notes, MARGIN, cursor);
    cursor += notes.length * 4.4 + 6;
  }

  if (record.history.length) {
    if (cursor > footerTop - 40) {
      doc.addPage();
      cursor = CONTENT_TOP;
    }
    autoTable(doc, {
      ...tableTheme,
      startY: cursor,
      columns: [
        { header: 'Date', dataKey: 'date' },
        { header: 'Stage', dataKey: 'stage' },
        { header: 'What happened', dataKey: 'note' },
      ],
      body: record.history.map((h) => ({
        date: formatDate(h.date),
        stage: getStage(h.stage).label,
        note: h.note ?? '—',
      })),
      columnStyles: {
        date: { cellWidth: 26, halign: 'center' },
        stage: { cellWidth: 34 },
        note: { cellWidth: 'auto' },
      },
    });
  }

  paintChrome(doc, 'Case sheet', caseRef(record), meta);

  return { blob: doc.output('blob'), filename: `case-${fileSafe(caseRef(record))}.pdf` };
}
