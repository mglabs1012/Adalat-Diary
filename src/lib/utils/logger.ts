type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const MIN_LEVEL: number =
  LEVELS[(process.env.LOG_LEVEL as Level) ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug')] ??
  LEVELS.info;

const TAG = {
  debug: '·',
  info: '›',
  warn: '!',
  error: '✕',
} as const;

/**
 * Strips credentials out of anything that looks like a connection string, so a
 * password can never reach a log file, a terminal or an error tracker.
 * `mongodb+srv://user:pa55@host/db` → `mongodb+srv://***:***@host/db`
 */
export function redact(input: string): string {
  return input.replace(/\/\/[^/@\s]*:[^/@\s]*@/g, '//***:***@');
}

function redactDeep(value: unknown): unknown {
  if (typeof value === 'string') return redact(value);
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as object).map(([k, v]) => [k, redactDeep(v)]));
  }
  return value;
}

function emit(level: Level, scope: string, message: string, meta?: Record<string, unknown>) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const time = new Date().toISOString().slice(11, 23);
  const head = `${TAG[level]} ${time} [${scope}] ${redact(message)}`;
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (meta && Object.keys(meta).length) sink(head, redactDeep(meta));
  else sink(head);
}

/** `const log = logger('db')` → every line is tagged with its subsystem. */
export function logger(scope: string) {
  return {
    debug: (message: string, meta?: Record<string, unknown>) => emit('debug', scope, message, meta),
    info: (message: string, meta?: Record<string, unknown>) => emit('info', scope, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => emit('warn', scope, message, meta),
    error: (message: string, meta?: Record<string, unknown>) => emit('error', scope, message, meta),
  };
}

/** Pulls the useful fields off a driver error without dumping the whole object. */
export function describeError(err: unknown): Record<string, unknown> {
  const e = err as {
    name?: string;
    message?: string;
    code?: number | string;
    codeName?: string;
    cause?: { message?: string };
  };
  return {
    name: e?.name,
    code: e?.code,
    codeName: e?.codeName,
    message: e?.message ? redact(String(e.message)).split('\n')[0] : undefined,
    cause: e?.cause?.message ? redact(e.cause.message).split('\n')[0] : undefined,
  };
}
