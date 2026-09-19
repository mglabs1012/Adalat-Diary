import type { NextRequest } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import { CaseModel } from '@/lib/models/Case';
import { caseUpdateSchema } from '@/lib/validation/case';
import { fail, requireOwnerId, handleError, ok, unauthorized } from '@/lib/utils/api';
import { serialize } from '@/lib/api/serialize';
import { getCase } from '@/lib/data/cases';
import { computeHearingDates } from '@/lib/data/hearingDates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    const record = await getCase(ownerId, id);
    if (!record) return fail('Case not found.', 404);

    return ok(record, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    if (!isValidObjectId(id)) return fail('Case not found.', 404);
    await connectDB();

    const body = await req.json().catch(() => null);
    if (!body) return fail('Invalid request body.');

    const data = caseUpdateSchema.parse(body);

    // Only a change of date moves the matter to a different page of the diary.
    // Every other edit — a note, a phone number, the stage — leaves the
    // derived days alone, and most edits are of that kind, so the extra read
    // is paid for only when it buys something.
    const movesInDiary = 'preDate' in data || 'nextDate' in data;

    let hearingDates: Date[] | undefined;
    if (movesInDiary) {
      // history.date only: the array can hold a hundred entries and the
      // derivation needs nothing else from them.
      const current = await CaseModel.findOne({ _id: id, ownerId })
        .select('preDate nextDate history.date')
        .lean()
        .exec();
      if (!current) return fail('Case not found.', 404);

      hearingDates = computeHearingDates({
        preDate: 'preDate' in data ? data.preDate : current.preDate,
        nextDate: 'nextDate' in data ? data.nextDate : current.nextDate,
        history: current.history,
      });
    }

    const doc = await CaseModel.findOneAndUpdate(
      { _id: id, ownerId },
      { $set: hearingDates ? { ...data, hearingDates } : data },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();

    if (!doc) return fail('Case not found.', 404);
    return ok(serialize(doc));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    if (!isValidObjectId(id)) return fail('Case not found.', 404);
    await connectDB();

    const res = await CaseModel.deleteOne({ _id: id, ownerId }).exec();
    if (!res.deletedCount) return fail('Case not found.', 404);

    return ok({ id, deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
