import { getDiaryStats } from '@/lib/data/cases';
import { handleError, ok, requireOwnerId, unauthorized } from '@/lib/utils/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ownerId = await requireOwnerId();
    if (!ownerId) return unauthorized();

    const stats = await getDiaryStats(ownerId);
    return ok(stats, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    return handleError(err);
  }
}
