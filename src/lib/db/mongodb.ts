import mongoose, { type Mongoose } from 'mongoose';
import { describeError, logger, redact } from '@/lib/utils/logger';

const log = logger('db');

/**
 * Serverless-safe connection. Next.js hot-reloads modules in dev and reuses
 * warm lambdas in prod — both would otherwise open a new pool per invocation
 * and exhaust Atlas connection limits.
 */
declare global {
  var __adalatMongoose:
    | { conn: Mongoose | null; promise: Promise<Mongoose> | null; listening: boolean }
    | undefined;
}

const cached = global.__adalatMongoose ?? { conn: null, promise: null, listening: false };
global.__adalatMongoose = cached;

/** Host list and database, with credentials removed — safe to log. */
function describeTarget(uri: string, dbName: string) {
  try {
    const afterAuth = uri.slice(uri.lastIndexOf('@') + 1);
    const hosts = afterAuth.split('/')[0].split('?')[0];
    return {
      scheme: uri.split('://')[0],
      hosts: hosts.split(',').map((h) => h.trim()),
      database: dbName,
    };
  } catch {
    return { scheme: 'unknown', hosts: [redact(uri)], database: dbName };
  }
}

/** Turns driver errors into the one sentence that actually tells you what to do. */
function diagnose(err: unknown): string {
  const e = err as { name?: string; code?: number | string; codeName?: string; message?: string };
  const message = String(e?.message ?? '');

  if (e?.codeName === 'AtlasError' && /bad auth/i.test(message)) {
    return 'Atlas rejected the username or password. Check Database Access in Atlas, and remember the password must be percent-encoded if it contains @ : / ? # [ ] or %.';
  }
  if (/authentication failed/i.test(message)) {
    return 'Authentication failed. Verify the database user, its password, and that authSource is correct (Atlas uses admin).';
  }
  if (e?.name === 'MongoServerSelectionError') {
    return 'No reachable server. Check the hostname, and confirm this machine’s IP is allowed under Network Access in Atlas.';
  }
  if (/ENOTFOUND|EBADNAME|querySrv/i.test(message)) {
    return 'The cluster hostname did not resolve. Check MONGODB_URI for typos or leftover placeholders.';
  }
  if (/ETIMEDOUT|ECONNREFUSED/i.test(message)) {
    return 'The connection timed out or was refused — usually a firewall or an IP allowlist.';
  }
  if (/not authorized/i.test(message)) {
    return 'Connected, but this user lacks permission on the database. Grant it readWrite on ' + (process.env.MONGODB_DB || 'adalat_diary') + '.';
  }
  return 'Connection failed. See the error details above.';
}

/** Mongoose lifecycle events, attached once per process. */
function attachListeners() {
  if (cached.listening) return;
  cached.listening = true;

  const conn = mongoose.connection;
  conn.on('connected', () => log.info('connected'));
  conn.on('reconnected', () => log.info('reconnected'));
  conn.on('disconnected', () => log.warn('disconnected — the driver will retry'));
  conn.on('close', () => log.info('connection closed'));
  conn.on('error', (err) => log.error('connection error', describeError(err)));
}

export async function connectDB(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    log.error('MONGODB_URI is not set — copy .env.example to .env.local and fill it in');
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
  }
  if (uri.includes('<user>') || uri.includes('<password>') || uri.includes('<cluster>')) {
    log.error('MONGODB_URI still contains the example placeholders');
    throw new Error('MONGODB_URI still contains placeholders. Paste your real connection string.');
  }

  const dbName = process.env.MONGODB_DB || 'adalat_diary';

  if (!cached.promise) {
    attachListeners();
    log.info('connecting', describeTarget(uri, dbName));

    mongoose.set('strictQuery', true);
    const startedAt = Date.now();

    cached.promise = mongoose
      .connect(uri, {
        dbName,
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 8000,
        socketTimeoutMS: 20000,
        compressors: ['zlib'],
      })
      .then((m) => {
        log.info('ready', {
          ms: Date.now() - startedAt,
          database: m.connection.name,
          host: m.connection.host,
        });
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // let the next request try again
    log.error('connect failed', describeError(err));
    log.error(diagnose(err));
    throw err;
  }

  return cached.conn;
}

/** Current driver state, for the health endpoint. */
export function connectionState(): {
  state: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'unknown';
  database?: string;
  host?: string;
} {
  // readyState 99 ("uninitialized") is outside the documented tuple.
  const map: Record<number, 'disconnected' | 'connected' | 'connecting' | 'disconnecting'> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: map[mongoose.connection.readyState] ?? 'unknown',
    database: mongoose.connection.name || undefined,
    host: mongoose.connection.host || undefined,
  };
}
