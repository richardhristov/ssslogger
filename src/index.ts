import { serializeError } from './serialize-error';

function stringify(value: unknown) {
  const cache: unknown[] = [];
  return JSON.stringify(
    value,
    (_: string, replacerValue: unknown) => {
      if (replacerValue instanceof Error) {
        return serializeError(replacerValue);
      }
      if (typeof replacerValue === 'object' && replacerValue !== null) {
        if (cache.includes(replacerValue)) {
          return;
        }
        cache.push(replacerValue);
      }
      return replacerValue;
    },
    2
  );
}

function formatMessage(args: {
  logger: string;
  ts: string;
  msg: string;
  obj?: Record<string, unknown>;
}) {
  return stringify({
    logger: args.logger,
    ts: args.ts,
    msg: args.msg,
    obj: args.obj,
  });
}

const levels = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof levels)[number];

export type LogHookArgs = {
  logger: string;
  ts: string;
  level: LogLevel;
  msg: string;
  obj?: Record<string, unknown>;
  formatted: string;
};
export type LogHook = (args: LogHookArgs) => void | Promise<void>;

export const consoleHook: LogHook = (args) =>
  // biome-ignore lint/suspicious/noConsole: console hook
  console[args.level](args.formatted);

export function createLogger(loggerArgs: {
  logger: string;
  level?: LogLevel;
  hooks?: LogHook[];
}) {
  const {
    logger,
    level: configuredLevel = 'debug',
    hooks = [consoleHook],
  } = loggerArgs;
  function logAtLevel(args: {
    level: LogLevel;
    msg: string;
    obj?: Record<string, unknown>;
  }) {
    try {
      // Skip messages below configured level
      if (levels.indexOf(args.level) < levels.indexOf(configuredLevel)) {
        return;
      }
      const ts = new Date().toISOString();
      const entry: LogHookArgs = {
        logger,
        ts,
        level: args.level,
        msg: args.msg,
        obj: args.obj,
        formatted: formatMessage({
          logger,
          ts,
          msg: args.msg,
          obj: args.obj,
        }),
      };
      // Execute all hooks – isolated so one failing hook doesn't break others.
      for (const hook of hooks) {
        try {
          hook(entry);
        } catch (err) {
          // biome-ignore lint/suspicious/noConsole: logger hook error
          console.error(
            stringify({
              ts: new Date().toISOString(),
              msg: 'logger_hook_error',
              err: serializeError(err),
              obj: { failedHook: hook.name, originalEntry: entry },
            })
          );
        }
      }
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: logger error
      console.error(
        stringify({
          ts: new Date().toISOString(),
          msg: 'logger_error',
          err: serializeError(err),
          obj: {
            msg: args.msg,
          },
        })
      );
    }
  }
  // Build logger API dynamically for each level
  return Object.fromEntries(
    levels.map((level) => [
      level,
      (msg: string, obj?: Record<string, unknown>) =>
        logAtLevel({ level, msg, obj }),
    ])
  ) as Record<
    LogLevel,
    (message: string, obj?: Record<string, unknown>) => void
  >;
}

export const log = createLogger({ logger: 'log' });

export type Log = typeof log;
