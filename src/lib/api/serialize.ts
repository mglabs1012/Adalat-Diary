import { computeHearingDates } from '@/lib/data/hearingDates';
import type { CaseListItem, CaseRecord } from '@/types/case';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Diary days for the wire, as `yyyy-MM-dd`.
 *
 * The stored array is authoritative, but a document written before the field
 * existed — or one returned from a projection that predates a backfill — has
 * to land on the right page too, so fall back to deriving it.
 */
function diaryDays(doc: any): string[] {
  const stored: unknown = doc.hearingDates;
  const source = Array.isArray(stored) && stored.length ? stored : computeHearingDates(doc);
  return source.map((d: Date | string) => new Date(d).toISOString().slice(0, 10));
}

/**
 * Mongo document -> wire record. Dates become ISO strings, `_id` becomes `id`
 * and `ownerId` never leaves the server.
 */
export function serialize(doc: any): CaseRecord {
  return {
    id: String(doc._id ?? doc.id),
    crn: doc.crn,
    caseNo: doc.caseNo ?? undefined,
    court: doc.court,
    courtRoom: doc.courtRoom ?? undefined,
    judge: doc.judge ?? undefined,
    party1: doc.party1,
    party2: doc.party2,
    stage: doc.stage,
    preDate: doc.preDate ? new Date(doc.preDate).toISOString() : null,
    nextDate: doc.nextDate ? new Date(doc.nextDate).toISOString() : null,
    hearingDates: diaryDays(doc),
    purpose: doc.purpose ?? undefined,
    appearingFor: doc.appearingFor ?? 'party1',
    clientName: doc.clientName ?? undefined,
    clientPhone: doc.clientPhone ?? undefined,
    notes: doc.notes ?? undefined,
    pinned: Boolean(doc.pinned),
    status: doc.status ?? 'active',
    history: (doc.history ?? []).map((h: any) => ({
      date: new Date(h.date).toISOString(),
      stage: h.stage,
      note: h.note ?? undefined,
      recordedAt: new Date(h.recordedAt ?? h.date).toISOString(),
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

/**
 * Wire shape for collection views. This deliberately omits the potentially
 * large `history` and `notes` fields; callers fetch the full record only when
 * a user opens a matter.
 */
export function serializeListItem(doc: any): CaseListItem {
  return {
    id: String(doc._id ?? doc.id),
    crn: doc.crn,
    caseNo: doc.caseNo ?? undefined,
    court: doc.court,
    courtRoom: doc.courtRoom ?? undefined,
    party1: doc.party1,
    party2: doc.party2,
    stage: doc.stage,
    preDate: doc.preDate ? new Date(doc.preDate).toISOString() : null,
    nextDate: doc.nextDate ? new Date(doc.nextDate).toISOString() : null,
    hearingDates: diaryDays(doc),
    purpose: doc.purpose ?? undefined,
    pinned: Boolean(doc.pinned),
    status: doc.status ?? 'active',
  };
}
