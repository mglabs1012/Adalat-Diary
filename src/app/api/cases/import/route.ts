import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db/mongodb';
import { CaseModel } from '@/lib/models/Case';
import { caseCreateSchema } from '@/lib/validation/case';
import { fail, handleError, ok, requireOwnerId, unauthorized } from '@/lib/utils/api';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = logger('import');

/** One request should not be able to insert a whole practice by accident. */
const MAX_ROWS = 500;

const importSchema = z.object({
  rows: z.array(z.object({ line: z.number().int(), data: z.record(z.unknown()) })).max(MAX_ROWS),
  /** Overwrite a matter whose CRN already exists, instead of skipping it. */
  overwrite: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return fail('Invalid request body.');

    const { rows, overwrite } = importSchema.parse(body);
    if (!rows.length) return fail('There are no rows to import.', 422);

    await connectDB();

    const imported: number[] = [];
    const updated: number[] = [];
    const skipped: { line: number; reason: string }[] = [];

    const valid: { line: number; data: ReturnType<typeof caseCreateSchema.parse> }[] = [];

    // Validate every row locally first, so one bad cell never prevents the
    // rest of the spreadsheet from importing.
    for (const row of rows) {
      try {
        const data = caseCreateSchema.parse(row.data);
        // A register marks closure in the stage column; the app also tracks it
        // as a status, so infer it rather than leaving closed matters active.
        if (data.stage === 'disposed' && !data.status) data.status = 'disposed';
        // Matching is by CRN. A row without one is always a new matter.
        valid.push({ line: row.line, data });
      } catch (err) {
        const message =
          err instanceof z.ZodError
            ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
            : (err as { code?: number })?.code === 11000
              ? 'That CRN is already in your diary'
              : 'Could not be saved';
        skipped.push({ line: row.line, reason: message });
      }
    }

    // One lookup identifies existing CRNs, then bulkWrite sends all inserts
    // and updates together. A 500-row import now makes two database trips,
    // rather than up to a thousand serial queries.
    const crns = [...new Set(valid.map(({ data }) => data.crn).filter(Boolean))];
    const existing = crns.length
      ? await CaseModel.find({ ownerId, crn: { $in: crns } }).select('_id crn').lean().exec()
      : [];
    const byCrn = new Map(existing.map((record) => [record.crn, record._id]));
    const seen = new Set<string>();
    const operations: Parameters<typeof CaseModel.bulkWrite>[0] = [];

    for (const { line, data } of valid) {
      if (data.crn && seen.has(data.crn)) {
        skipped.push({ line, reason: `CRN ${data.crn} appears more than once in this file` });
        continue;
      }
      if (data.crn) seen.add(data.crn);

      const existingId = data.crn ? byCrn.get(data.crn) : undefined;
      if (existingId && !overwrite) {
        skipped.push({ line, reason: `CRN ${data.crn} is already in your diary` });
        continue;
      }

      if (existingId) {
        operations.push({ updateOne: { filter: { _id: existingId }, update: { $set: data } } });
        updated.push(line);
      } else {
        operations.push({
          insertOne: {
            document: {
              ...data,
              ownerId,
              history: data.preDate
                ? [{ date: data.preDate, stage: data.stage, note: 'Imported', recordedAt: new Date() }]
                : [],
            },
          },
        });
        imported.push(line);
      }
    }

    if (operations.length) await CaseModel.bulkWrite(operations, { ordered: false });

    log.info('csv import', {
      imported: imported.length,
      updated: updated.length,
      skipped: skipped.length,
    });

    return ok({
      imported: imported.length,
      updated: updated.length,
      skipped,
    });
  } catch (err) {
    return handleError(err);
  }
}
