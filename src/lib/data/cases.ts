import 'server-only';
import { isValidObjectId, type FilterQuery } from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import { CaseModel, type CaseDoc } from '@/lib/models/Case';
import { serialize, serializeListItem } from '@/lib/api/serialize';
import { addDays, endOfDay, startOfDay } from '@/lib/utils/date';
import type { CaseFilter, CaseListResponse, CaseRecord, DiaryStats } from '@/types/case';

/**
 * The single server-side reader for case data. Both the JSON API and the
 * Server Components call this, so a screen rendered on the server and the same
 * screen revalidated on the client can never disagree about what a filter means.
 */

function escapeRegex(input: string): string {
  return input.replace(/[-\/\\^$*+?.()|[\]{}]/g, String.raw`\$&`);
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
  const today = startOfDay();

  switch (filter) {
    case 'range': {
      // A cause list for a window of dates. Status is deliberately not
      // constrained: what matters is what carried a date in that window.
      const window: Record<string, Date> = {};
      if (range?.from) window.$gte = startOfDay(range.from);
      if (range?.to) window.$lte = endOfDay(range.to);
      query.nextDate = Object.keys(window).length ? window : { $ne: null };
      break;
    }
    case 'today':
      query.status = 'active';
      query.nextDate = { $gte: today, $lte: endOfDay() };
      break;
    case 'upcoming':
      query.status = 'active';
      query.nextDate = { $gte: today };
      break;
    case 'overdue':
      query.status = 'active';
      query.nextDate = { $lt: today, $ne: null };
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

  // Overdue and disposed read newest-first; everything else reads pinned-first
  // then by the next listed date.
  const sort: Record<string, 1 | -1> =
    filter === 'disposed' || filter === 'overdue'
      ? { nextDate: -1, updatedAt: -1 }
      : filter === 'range'
        ? { nextDate: 1, crn: 1 }
        : { pinned: -1, nextDate: 1, updatedAt: -1 };

  const listQuery = CaseModel.find(query)
    .select('crn caseNo court courtRoom party1 party2 stage preDate nextDate purpose pinned status')
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

/** Six board counters in one round trip via $facet. */
export async function getDiaryStats(ownerId: string): Promise<DiaryStats> {
  await connectDB();
  const today = startOfDay();
  const todayEnd = endOfDay();
  const tomorrowStart = addDays(today, 1);
  const tomorrowEnd = endOfDay(tomorrowStart);
  const weekEnd = endOfDay(addDays(today, 7));

  const [facet] = await CaseModel.aggregate([
    { $match: { ownerId } },
    {
      $facet: {
        today: [
          { $match: { status: 'active', nextDate: { $gte: today, $lte: todayEnd } } },
          { $count: 'n' },
        ],
        tomorrow: [
          { $match: { status: 'active', nextDate: { $gte: tomorrowStart, $lte: tomorrowEnd } } },
          { $count: 'n' },
        ],
        thisWeek: [
          { $match: { status: 'active', nextDate: { $gte: today, $lte: weekEnd } } },
          { $count: 'n' },
        ],
        overdue: [
          { $match: { status: 'active', nextDate: { $lt: today, $ne: null } } },
          { $count: 'n' },
        ],
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
