import 'server-only';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import { CaseModel, type CaseDoc } from '@/lib/models/Case';
import { serialize, serializeListItem } from '@/lib/api/serialize';
import { diaryToday, toDiaryDay } from '@/lib/utils/date';
import type { CaseFilter, CaseListResponse, CaseRecord, DiaryStats } from '@/types/case';

/**
 * The single server-side reader for case data. Both the JSON API and the
 * Server Components call this, so a screen rendered on the server and the same
 * screen revalidated on the client can never disagree about what a filter means.
 */

function escapeRegex(input: string): string {
  return input.replace(/[-\/\^$*+?.()|[\]{}]/g, String.raw`\$&`);
}

function addUtcDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * 86_400_000);
}

/** Turns the UI filter chips into an index-friendly Mongo query. */
function buildQuery(
  ownerId: string,
  filter: CaseFilter,
  q?: string,
  stage?: string,
  range?: { from?: string; to?: string },
) {
  const query: FilterQuery<CaseDoc> = { ownerId };
  const day = diaryToday();

  switch (filter) {
    case 'range': {
      // A page of the diary. Matched against every day the matter occupies —
      // its previous date as much as its next one — so a matter written in
      // with no next date still appears on the day it was actually before the
      // court, exactly as it would in a paper diary. Status is deliberately
      // not constrained: what matters is what touched the window.
      //
      // $elemMatch, not a bare range: against an array Mongo lets a different
      // element satisfy each bound, so { $gte: d, $lte: d } would match a
      // record with one date before d and another after it. $elemMatch makes
      // one day satisfy both, which is what "on this page" means.
      const bounds: Record<string, Date> = {};
      const start = toDiaryDay(range?.from);
      const end = toDiaryDay(range?.to);
      if (start) bounds.$gte = start;
      if (end) bounds.$lte = end;
      query.hearingDates = Object.keys(bounds).length
        ? { $elemMatch: bounds }
        : { $exists: true, $ne: [] };
      break;
    }
    case 'today':
      // Equality against the array means "contains" — a matter heard today and
      // already adjourned still belongs on today's page.
      query.status = 'active';
      query.hearingDates = day;
      break;
    case 'upcoming':
      query.status = 'active';
      query.nextDate = { $gte: day };
      break;
    case 'overdue':
      query.status = 'active';
      query.nextDate = { $lt: day, $ne: null };
      break;
    case 'undated':
      // Open matters the court has not given a date for. Without this they
      // would show up in no dated view at all.
      query.status = 'active';
      query.nextDate = null;
      break;
    case 'disposed':
      query.status = 'disposed';
      break;
    default:
      query.status = 'active';
  }

  if (stage) query.stage = stage;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    query.$or = [{ crn: rx }, { caseNo: rx }, { party1: rx }, { party2: rx }, { court: rx }, { judge: rx }];
  }
  return query;
}

export interface ListOptions {
  filter: CaseFilter;
  q?: string;
  stage?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
  /** Summary-only screens do not render totals, so avoid a count scan. */
  includeTotal?: boolean;
}

export async function listCases(ownerId: string, opts: ListOptions): Promise<CaseListResponse> {
  const { filter, q, stage, from, to, page, pageSize, includeTotal = true } = opts;

  await connectDB();
  const query = buildQuery(ownerId, filter, q, stage, { from, to });
  const skip = (page - 1) * pageSize;

  // Overdue and disposed read newest-first; undated has no date to sort on, so
  // it reads by when it was last before the court; everything else reads
  // pinned-first then by the next listed date.
  const sort: Record<string, 1 | -1> =
    filter === 'disposed' || filter === 'overdue'
      ? { nextDate: -1, updatedAt: -1 }
      : filter === 'undated'
        ? { preDate: -1, updatedAt: -1 }
        : filter === 'range'
          ? { nextDate: 1, crn: 1 }
          : { pinned: -1, nextDate: 1, updatedAt: -1 };

  const listQuery = CaseModel.find(query)
    .select(
      'crn caseNo court courtRoom party1 party2 stage preDate nextDate hearingDates purpose pinned status',
    )
    .sort(sort)
    .skip(skip)
    // One extra row gives no-total views an accurate `hasMore` without a
    // second collection scan.
    .limit(pageSize + (includeTotal ? 0 : 1))
    .lean()
    .exec();

  const [rawDocs, total] = includeTotal
    ? await Promise.all([listQuery, CaseModel.countDocuments(query).exec()])
    : [await listQuery, undefined];
  const hasMore = includeTotal ? skip + rawDocs.length < (total ?? 0) : rawDocs.length > pageSize;
  const docs = hasMore && !includeTotal ? rawDocs.slice(0, pageSize) : rawDocs;

  return {
    items: docs.map(serializeListItem),
    total: total ?? docs.length,
    page,
    pageSize,
    hasMore,
  };
}

/** The board counters, in one round trip via $facet. */
export async function getDiaryStats(ownerId: string): Promise<DiaryStats> {
  await connectDB();
  const day = diaryToday();
  const tomorrow = addUtcDays(day, 1);
  const weekEnd = addUtcDays(day, 7);

  const [facet] = await CaseModel.aggregate([
    { $match: { ownerId } },
    {
      $facet: {
        // Counted off the diary days, so a matter heard today still counts as
        // today's work after it has been adjourned forward.
        today: [{ $match: { status: 'active', hearingDates: day } }, { $count: 'n' }],
        tomorrow: [{ $match: { status: 'active', hearingDates: tomorrow } }, { $count: 'n' }],
        thisWeek: [
          { $match: { status: 'active', nextDate: { $gte: day, $lte: weekEnd } } },
          { $count: 'n' },
        ],
        overdue: [{ $match: { status: 'active', nextDate: { $lt: day, $ne: null } } }, { $count: 'n' }],
        undated: [{ $match: { status: 'active', nextDate: null } }, { $count: 'n' }],
        active: [{ $match: { status: 'active' } }, { $count: 'n' }],
        disposed: [{ $match: { status: 'disposed' } }, { $count: 'n' }],
      },
    },
  ]).exec();

  const pick = (k: string) => facet?.[k]?.[0]?.n ?? 0;

  return {
    today: pick('today'),
    tomorrow: pick('tomorrow'),
    thisWeek: pick('thisWeek'),
    overdue: pick('overdue'),
    undated: pick('undated'),
    active: pick('active'),
    disposed: pick('disposed'),
  };
}

/** A single record, always scoped by owner so an id alone leaks nothing. */
export async function getCase(ownerId: string, id: string): Promise<CaseRecord | null> {
  if (!isValidObjectId(id)) return null;

  await connectDB();
  const doc = await CaseModel.findOne({ _id: id, ownerId }).lean().exec();
  return doc ? serialize(doc) : null;
}
