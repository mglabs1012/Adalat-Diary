import mongoose from 'mongoose';
import { connectDB, connectionState } from '@/lib/db/mongodb';
import { describeError, logger } from '@/lib/utils/logger';
import { ok } from '@/lib/utils/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = logger('health');

/**
 * Answers one question: can this app talk to its database right now?
 * Open `/api/health` whenever the app misbehaves — it reports the real reason
 * instead of the generic message the UI shows.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    await connectDB();
    await mongoose.connection.db?.admin().ping();

    const state = connectionState();
    log.info('ok', { ms: Date.now() - startedAt, ...state });

    return ok(
      { status: 'ok', database: state, latencyMs: Date.now() - startedAt },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const detail = describeError(err);
    log.error('database unreachable', detail);

    return ok(
      {
        status: 'error',
        database: connectionState(),
        latencyMs: Date.now() - startedAt,
        // Safe to return: the logger has already stripped any credentials.
        error: detail,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
