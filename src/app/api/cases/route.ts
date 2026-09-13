import type { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb';
import { CaseModel } from '@/lib/models/Case';
import { caseCreateSchema, listQuerySchema } from '@/lib/validation/case';
import { fail, handleError, ok, requireOwnerId, unauthorized } from '@/lib/utils/api';
import { serialize } from '@/lib/api/serialize';
import { listCases } from '@/lib/data/cases';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    const { q, filter, stage, page, pageSize } = listQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    const result = await listCases(ownerId, { filter, q, stage, page, pageSize });
    return ok(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return fail('Invalid request body.');

    const data = caseCreateSchema.parse(body);

    await connectDB();
    const created = await CaseModel.create({
      ...data,
      ownerId,
      history: data.preDate
        ? [{ date: data.preDate, stage: data.stage, note: 'Opened in diary', recordedAt: new Date() }]
        : [],
    });

    return ok(serialize(created.toObject()), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
