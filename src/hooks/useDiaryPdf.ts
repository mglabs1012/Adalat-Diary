'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CaseListItem, CaseListResponse, CaseRecord } from '@/types/case';
import { casesKey } from '@/lib/api/keys';
import { caseRef, causeSlip } from '@/lib/utils/case';
import { formatDate, toInputDate } from '@/lib/utils/date';
import { sharePdf, shareText, type ShareOutcome } from '@/lib/utils/share';
import { useSession } from '@/components/layout/SessionProvider';
import { toast } from './useToast';

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Adalat Diary';
const EXPORT_LIMIT = 500;

function report(outcome: ShareOutcome, noun: string) {
  if (outcome === 'shared') toast(`${noun} shared`, 'success');
  else if (outcome === 'downloaded') toast(`${noun} saved to your device`, 'success');
}

/** The fast, stateless share path used on every case card. */
export async function shareCaseText(record: CaseListItem | CaseRecord): Promise<void> {
  const outcome = await shareText(caseRef(record), causeSlip(record, formatDate));
  if (outcome === 'shared') toast('Shared', 'success');
  else if (outcome === 'downloaded') toast('Copied to clipboard', 'success');
}

async function fetchRange(from: string, to: string): Promise<CaseListItem[]> {
  const res = await fetch(
    casesKey({ filter: 'range', from, to, page: 1, pageSize: EXPORT_LIMIT }),
  );
  if (!res.ok) throw new Error('Could not read your diary');
  const body = (await res.json()) as CaseListResponse;
  return body.items;
}

/** Groups a flat list into one bucket per calendar day, in date order. */
function groupByDay(cases: CaseListItem[]) {
  const map = new Map<string, { key: string; date: string; cases: CaseListItem[] }>();
  for (const c of cases) {
    if (!c.nextDate) continue;
    const key = c.nextDate.slice(0, 10);
    const group = map.get(key) ?? { key, date: c.nextDate, cases: [] };
    group.cases.push(c);
    map.set(key, group);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Builds and shares diary PDFs. Everything is generated in the browser — the
 * records are already there, and a serverless function rendering PDFs would be
 * slower and cost more than doing it on the device.
 */
export function useDiaryPdf() {
  const session = useSession();
  const [busy, setBusy] = useState<null | 'day' | 'month' | 'case'>(null);

  const meta = useMemo(
    () => ({ chamber: session.username, appName: APP_NAME }),
    [session.username],
  );

  const shareDay = useCallback(
    async (date: Date) => {
      setBusy('day');
      try {
        const day = toInputDate(date);
        const cases = await fetchRange(day, day);
        const { buildDayPdf } = await import('@/lib/pdf/diary');
        const { blob, filename } = await buildDayPdf(cases, date, meta);
        report(
          await sharePdf(blob, filename, `Cause list — ${formatDate(date)}`),
          'Cause list',
        );
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not build the PDF', 'error');
      } finally {
        setBusy(null);
      }
    },
    [meta],
  );

  const shareMonth = useCallback(
    async (month: Date) => {
      setBusy('month');
      try {
        const first = new Date(month.getFullYear(), month.getMonth(), 1);
        const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        const cases = await fetchRange(toInputDate(first), toInputDate(last));

        const { buildMonthPdf } = await import('@/lib/pdf/diary');
        const { blob, filename } = await buildMonthPdf(groupByDay(cases), first, meta);
        report(await sharePdf(blob, filename, 'Monthly diary'), 'Monthly diary');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not build the PDF', 'error');
      } finally {
        setBusy(null);
      }
    },
    [meta],
  );

  const shareCasePdf = useCallback(
    async (record: CaseRecord) => {
      setBusy('case');
      try {
        const { buildCasePdf } = await import('@/lib/pdf/diary');
        const { blob, filename } = await buildCasePdf(record, meta);
        report(await sharePdf(blob, filename, caseRef(record)), 'Case sheet');
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Could not build the PDF', 'error');
      } finally {
        setBusy(null);
      }
    },
    [meta],
  );

  return { busy, shareDay, shareMonth, shareCasePdf, shareCaseText };
}
