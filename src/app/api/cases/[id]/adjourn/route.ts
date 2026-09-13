import type { NextRequest } from 'next/server';
import { isValidObjectId } from 'mongoose';
import { connectDB } from '@/lib/db/mongodb';
import { CaseModel } from '@/lib/models/Case';
import { adjournSchema } from '@/lib/validation/case';
import { fail, requireOwnerId, handleError, ok, unauthorized } from '@/lib/utils/api';
import { serialize } from '@/lib/api/serialize';

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
    const { nextDate, stage, note, purpose, disposed } = adjournSchema.parse(body ?? {});

    if (!isValidObjectId(id)) return fail('Case not found.', 404);
    await connectDB();

    const current = await CaseModel.findOne({ _id: id, ownerId })
      .select('nextDate stage')
      .lean()
      .exec();
    if (!current) return fail('Case not found.', 404);

    const heardOn = current.nextDate ? new Date(current.nextDate) : new Date();
    const nextStage = disposed ? 'disposed' : (stage ?? current.stage);

    const doc = await CaseModel.findOneAndUpdate(
      { _id: id, ownerId },
      {
        $set: {
          preDate: heardOn,
          nextDate: disposed ? null : nextDate,
          stage: nextStage,
          status: disposed ? 'disposed' : 'active',
          ...(purpose ? { purpose } : {}),
        },
        $push: {
          history: {
            $each: [
              {
                date: heardOn,
                stage: stage ?? current.stage,
                note: note || (disposed ? 'Matter disposed of' : 'Adjourned'),
                recordedAt: new Date(),
              },
            ],
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
