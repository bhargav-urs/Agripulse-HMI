/**
 * Tiny dependency-free structured logger. Keeps the install light while still
 * giving timestamped, levelled, colourised output.
 */

const COLORS = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
} as const;

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_COLOR: Record<Level, string> = {
  debug: COLORS.gray,
  info: COLORS.blue,
  warn: COLORS.yellow,
  error: COLORS.red,
};

function format(level: Level, scope: string, message: string, meta?: unknown): string {
  const time = new Date().toISOString();
  const color = LEVEL_COLOR[level];
  const base = `${COLORS.gray}${time}${COLORS.reset} ${color}${level.toUpperCase().padEnd(5)}${COLORS.reset} ${COLORS.cyan}[${scope}]${COLORS.reset} ${message}`;
  if (meta !== undefined) {
    return `${base} ${COLORS.gray}${safeStringify(meta)}${COLORS.reset}`;
  }
  return base;
}

function safeStringify(value: unknown): string {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function createLogger(scope: string) {
  return {
    debug: (msg: string, meta?: unknown) => console.debug(format('debug', scope, msg, meta)),
    info: (msg: string, meta?: unknown) => console.log(format('info', scope, msg, meta)),
    warn: (msg: string, meta?: unknown) => console.warn(format('warn', scope, msg, meta)),
    error: (msg: string, meta?: unknown) => console.error(format('error', scope, msg, meta)),
  };
}

export const logger = createLogger('app');
