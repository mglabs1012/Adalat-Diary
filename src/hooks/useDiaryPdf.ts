'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CaseListItem, CaseListResponse, CaseRecord } from '@/types/case';
import { casesKey } from '@/lib/api/keys';
import { groupByDiaryDay } from '@/lib/data/diaryDays';
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
        // The page for a day holds everything that touched it — matters
        // listed that day, and matters that were heard and have since moved
        // on — which is what the shared grouper works out.
        const [group] = groupByDiaryDay(cases, { from: day, to: day });
        const { buildDayPdf } = await import('@/lib/pdf/diary');
        const { blob, filename } = await buildDayPdf(group?.entries ?? [], date, meta);
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
        const from = toInputDate(first);
        const to = toInputDate(last);
        const cases = await fetchRange(from, to);

        const { buildMonthPdf } = await import('@/lib/pdf/diary');
        const { blob, filename } = await buildMonthPdf(
          groupByDiaryDay(cases, { from, to }),
          first,
          meta,
        );
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
