import type { NextRequest } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import { CaseModel } from '@/lib/models/Case';
import { adjournSchema } from '@/lib/validation/case';
import { fail, requireOwnerId, handleError, ok, unauthorized } from '@/lib/utils/api';
import { serialize } from '@/lib/api/serialize';
import { computeHearingDates } from '@/lib/data/hearingDates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/**
 * The most-used action in a court diary: the listing is over, roll it forward.
 * nextDate becomes preDate, a fresh nextDate is set, and the hearing is pushed
 * onto the procedural history - all in one atomic write.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    const body = await req.json().catch(() => ({}));
    const { nextDate, heardOn, stage, note, purpose, disposed } = adjournSchema.parse(body ?? {});

    if (!isValidObjectId(id)) return fail('Case not found.', 404);
    await connectDB();

    const current = await CaseModel.findOne({ _id: id, ownerId })
      .select('nextDate stage history hearingDates')
      .lean()
      .exec();
    if (!current) return fail('Case not found.', 404);

    // The day it was heard is the user's to state: a listing recorded that
    // evening, or three days later from the chamber, still belongs on the day
    // the court actually took it up. Only fall back to the clock when neither
    // the client nor the record offers a date.
    const heardDate = heardOn ?? (current.nextDate ? new Date(current.nextDate) : new Date());
    const nextStage = disposed ? 'disposed' : (stage ?? current.stage);
    const entry = {
      date: heardDate,
      stage: stage ?? current.stage,
      note: note || (disposed ? 'Matter disposed of' : 'Adjourned'),
      recordedAt: new Date(),
    };

    const doc = await CaseModel.findOneAndUpdate(
      { _id: id, ownerId },
      {
        $set: {
          preDate: heardDate,
          nextDate: disposed ? null : nextDate,
          stage: nextStage,
          status: disposed ? 'disposed' : 'active',
          // The day just heard stays in the diary alongside the new date, so
          // the page for that day still shows what was before the court.
          hearingDates: computeHearingDates({
            preDate: heardDate,
            nextDate: disposed ? null : nextDate,
            history: [...(current.history ?? []), entry],
          }),
          ...(purpose ? { purpose } : {}),
        },
        $push: {
          history: {
            $each: [entry],
            $position: 0,
            $slice: 100,
          },
        },
      },
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
