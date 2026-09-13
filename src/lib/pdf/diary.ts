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

const PAGE = { width: 210, height: 297 };
const MARGIN = 14;
const HEADER_H = 26;
const CONTENT_TOP = HEADER_H + 8;
const FOOTER_TOP = PAGE.height - 16;

export interface PdfMeta {
  /** The chamber this was generated for — the signed-in username. */
  chamber: string;
  appName: string;
}

type Doc = import('jspdf').jsPDF;

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

  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);

    // ── Header band ──────────────────────────────────────────────────────
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, PAGE.width, HEADER_H, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, HEADER_H, PAGE.width, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(meta.appName, MARGIN, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GOLD);
    doc.text('COURT DIARY', MARGIN, 16.5, { charSpace: 0.8 });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(title, PAGE.width - MARGIN, 11, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(196, 211, 236);
    doc.text(subtitle, PAGE.width - MARGIN, 16.5, { align: 'right' });

    // ── Footer ───────────────────────────────────────────────────────────
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, FOOTER_TOP, PAGE.width - MARGIN, FOOTER_TOP);

    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${meta.appName} · @${meta.chamber}`, MARGIN, FOOTER_TOP + 5);
    doc.text(
      `Generated ${formatDate(generated)} at ${generated.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      PAGE.width / 2,
      FOOTER_TOP + 5,
      { align: 'center' },
    );
    doc.text(`Page ${page} of ${pages}`, PAGE.width - MARGIN, FOOTER_TOP + 5, { align: 'right' });
  }
}

const tableTheme = {
  theme: 'grid' as const,
  styles: {
    font: 'helvetica',
    fontSize: 8,
    cellPadding: { top: 2.1, right: 2, bottom: 2.1, left: 2 },
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
    fontSize: 7.5,
    cellPadding: { top: 2.4, right: 2, bottom: 2.4, left: 2 },
  },
  alternateRowStyles: { fillColor: ZEBRA },
  margin: { top: CONTENT_TOP, bottom: 22, left: MARGIN, right: MARGIN },
};

/** Columns shared by every cause list. `showNext` is dropped in month tables,
 *  where the day heading above the table already states the date. */
function columns(showNext: boolean) {
  const base = [
    { header: '#', dataKey: 'index' },
    { header: 'CRN', dataKey: 'crn' },
    { header: 'Parties', dataKey: 'parties' },
    { header: 'Court', dataKey: 'court' },
    { header: 'Stage', dataKey: 'stage' },
    { header: 'Prev. date', dataKey: 'preDate' },
  ];
  if (showNext) base.push({ header: 'Next date', dataKey: 'nextDate' });
  base.push({ header: 'Listed for', dataKey: 'purpose' });
  return base;
}

/**
 * A4 portrait leaves 182mm between the margins. These add up to well under
 * that so the 'auto' column keeps ~35mm — enough that "Cross examination"
 * wraps between words instead of being hyphenated mid-word.
 */
function columnStyles(showNext: boolean) {
  const styles: Record<string, Record<string, unknown>> = {
    index: { cellWidth: 7, halign: 'center', textColor: MUTED },
    crn: { cellWidth: showNext ? 25 : 27, fontStyle: 'bold', fontSize: 7.5 },
    parties: { cellWidth: showNext ? 38 : 44 },
    court: { cellWidth: showNext ? 28 : 32 },
    stage: { cellWidth: showNext ? 18 : 20 },
    preDate: { cellWidth: 17, halign: 'center' },
    purpose: { cellWidth: 'auto' },
  };
  if (showNext) styles.nextDate = { cellWidth: 17, halign: 'center', fontStyle: 'bold' };
  return styles;
}

function rows(cases: CaseRecord[], showNext: boolean) {
  return cases.map((c, i) => {
    const row: Record<string, string | number> = {
      index: i + 1,
      crn: c.crn || '—',
      parties: causeTitle(c),
      court: c.courtRoom ? `${c.court}\n${c.courtRoom}` : c.court,
      stage: getStage(c.stage).label,
      preDate: c.preDate ? formatDate(c.preDate) : '—',
      purpose: c.purpose ?? '—',
    };
    if (showNext) row.nextDate = c.nextDate ? formatDate(c.nextDate) : '—';
    return row;
  });
}

function fileSafe(text: string) {
  return text.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

/* ── Day cause list ───────────────────────────────────────────────────────── */

export async function buildDayPdf(
  cases: CaseRecord[],
  date: Date,
  meta: PdfMeta,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  autoTable(doc, {
    ...tableTheme,
    startY: CONTENT_TOP,
    columns: columns(false),
    body: rows(cases, false),
    columnStyles: columnStyles(false),
  });

  if (!cases.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No matters listed on this date.', PAGE.width / 2, CONTENT_TOP + 14, {
      align: 'center',
    });
  }

  paintChrome(
    doc,
    'Cause list',
    `${formatLongDate(date)} · ${cases.length} matter${cases.length === 1 ? '' : 's'}`,
    meta,
  );

  return {
    blob: doc.output('blob'),
    filename: `cause-list-${fileSafe(formatDate(date))}.pdf`,
  };
}

/* ── Month diary ──────────────────────────────────────────────────────────── */

export interface DayGroup {
  /** yyyy-MM-dd */
  key: string;
  date: string;
  cases: CaseRecord[];
}

const MONTH_FMT = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' });

/**
 * One table per day, in date order, each under its own heading — which is what
 * makes a month readable. A single 200-row table would be useless.
 */
export async function buildMonthPdf(
  groups: DayGroup[],
  month: Date,
  meta: PdfMeta,
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const total = groups.reduce((n, g) => n + g.cases.length, 0);
  let cursor = CONTENT_TOP;

  if (!groups.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text('No matters listed in this month.', PAGE.width / 2, cursor + 14, { align: 'center' });
  }

  groups.forEach((group, i) => {
    const headingH = 9;
    // Keep a day heading with at least its first row; never orphan it.
    const needed = headingH + 18;
    if (i > 0 && cursor + needed > FOOTER_TOP - 6) {
      doc.addPage();
      cursor = CONTENT_TOP;
    }

    doc.setFillColor(...DAY_BAND);
    doc.roundedRect(MARGIN, cursor, PAGE.width - MARGIN * 2, headingH, 1.5, 1.5, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(MARGIN, cursor, 1.6, headingH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(formatLongDate(group.date), MARGIN + 4.5, cursor + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `${group.cases.length} matter${group.cases.length === 1 ? '' : 's'}`,
      PAGE.width - MARGIN - 3,
      cursor + 6,
      { align: 'right' },
    );

    cursor += headingH + 2;

    autoTable(doc, {
      ...tableTheme,
      startY: cursor,
      columns: columns(false),
      body: rows(group.cases, false),
      columnStyles: columnStyles(false),
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

  let cursor = CONTENT_TOP;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  const title = doc.splitTextToSize(causeTitle(record), PAGE.width - MARGIN * 2);
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

  const detail: [string, string][] = [
    ['Court', record.courtRoom ? `${record.court} · ${record.courtRoom}` : record.court],
    ['Presiding judge', record.judge ?? '—'],
    ['Stage', getStage(record.stage).label],
    ['Previous date', record.preDate ? formatDate(record.preDate) : '—'],
    ['Next date', record.status === 'disposed' ? 'Disposed' : formatDate(record.nextDate)],
    ['Listed for', record.purpose ?? '—'],
    ['Appearing for', record.appearingFor === 'party2' ? 'Respondent' : 'Petitioner'],
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
    const notes = doc.splitTextToSize(record.notes, PAGE.width - MARGIN * 2);
    doc.text(notes, MARGIN, cursor);
    cursor += notes.length * 4.4 + 6;
  }

  if (record.history.length) {
    if (cursor > FOOTER_TOP - 40) {
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
