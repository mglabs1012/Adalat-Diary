import type { CaseRecord } from '@/types/case';

/* eslint-disable @typescript-eslint/no-explicit-any */

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
