/** biome-ignore-all lint/suspicious/noConsole: test */

import http from 'node:http';
import axios, { AxiosError } from 'axios';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createLogger, type LogHook, log, serializeError } from '../src/index';

// Test utilities
function mockSystemTime(date = '2024-03-25T12:00:00.000Z') {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(date));
  return new Date(date).toISOString();
}

function setupConsoleSpies() {
  const spies = {
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {
      return;
    }),
    info: vi.spyOn(console, 'info').mockImplementation(() => {
      return;
    }),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    }),
    error: vi.spyOn(console, 'error').mockImplementation(() => {
      return;
    }),
  };

  return {
    spies,
    reset: () => {
      for (const spy of Object.values(spies)) {
        spy.mockClear();
      }
    },
    restore: () => {
      for (const spy of Object.values(spies)) {
        spy.mockRestore();
      }
    },
  };
}

const formatExpected = (obj: Record<string, unknown>) =>
  JSON.stringify(obj, null, 2);

// Regex patterns for timestamp matching
const TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

class AxiosErrorWrapper {
  private error: AxiosError;

  constructor(error: AxiosError) {
    this.error = error;
  }

  toJSON() {
    return {
      ...this.error.toJSON(),
      responseData: this.error.response?.data,
    };
  }
}

axios.interceptors.response.use(undefined, (error) => {
  if (error instanceof AxiosError) {
    return Promise.reject(new AxiosErrorWrapper(error));
  }
  return Promise.reject(error);
});

describe('log', () => {
  let consoleSpies: ReturnType<typeof setupConsoleSpies>;
  let expectedTimestamp: string;

  beforeAll(() => {
    expectedTimestamp = mockSystemTime();
    consoleSpies = setupConsoleSpies();
  });

  beforeEach(() => {
    consoleSpies.reset();
  });

  afterAll(() => {
    vi.useRealTimers();
    consoleSpies.restore();
  });

  // Parameterized tests for different log levels
  describe.each<{
    level: 'debug' | 'info' | 'warn' | 'error';
    method: keyof Console;
  }>([
    { level: 'debug', method: 'debug' },
    { level: 'info', method: 'info' },
    { level: 'warn', method: 'warn' },
    { level: 'error', method: 'error' },
  ])('$level level', ({ level, method }) => {
    it(`logs ${level} messages`, () => {
      log[level](`test ${level} message`);
      expect(consoleSpies.spies[method]).toHaveBeenCalledWith(
        formatExpected({
          logger: 'log',
          ts: expectedTimestamp,
          msg: `test ${level} message`,
          obj: undefined,
        })
      );
    });

    it(`logs ${level} messages with objects`, () => {
      const testObj = { key: 'value' };
      log[level](`test ${level} message with object`, testObj);
      expect(consoleSpies.spies[method]).toHaveBeenCalledWith(
        formatExpected({
          logger: 'log',
          ts: expectedTimestamp,
          msg: `test ${level} message with object`,
          obj: testObj,
        })
      );
    });
  });

  it('handles errors in objects', () => {
    const testError = new Error('test error');
    log.info('test message with error', { error: testError });

    const actualCall = consoleSpies.spies.info.mock.calls[0][0];
    const parsed = JSON.parse(actualCall as string);

    expect(parsed).toEqual({
      logger: 'log',
      ts: expectedTimestamp,
      msg: 'test message with error',
      obj: {
        error: {
          name: 'Error',
          message: 'test error',
          stack: expect.stringContaining('Error: test error'),
        },
      },
    });
  });

  it('handles circular references', () => {
    interface CircularObj extends Record<string, unknown> {
      key: string;
      self?: CircularObj;
    }
    const circularObj: CircularObj = { key: 'value' };
    circularObj.self = circularObj;

    log.info('test message with circular reference', circularObj);
    expect(consoleSpies.spies.info).toHaveBeenCalledWith(
      formatExpected({
        logger: 'log',
        ts: expectedTimestamp,
        msg: 'test message with circular reference',
        obj: {
          key: 'value',
          self: undefined, // Circular reference gets omitted
        },
      })
    );
  });

  it('handles logger errors gracefully', () => {
    const badObj = {
      get throwsError() {
        throw new Error('test logger error');
      },
    };

    log.info('test message with bad object', badObj);

    const actualCall = consoleSpies.spies.error.mock.calls[0][0];
    const parsed = JSON.parse(actualCall as string);

    expect(parsed).toEqual({
      ts: expect.stringMatching(TIMESTAMP_REGEX),
      msg: 'logger_error',
      err: {
        name: 'Error',
        message: 'test logger error',
        stack: expect.stringContaining('Error: test logger error'),
      },
      obj: {
        msg: 'test message with bad object',
      },
    });
  });

  // Parameterized tests for null/undefined handling
  describe.each<{
    name: string;
    obj: Record<string, unknown>;
    expected: Record<string, unknown>;
  }>([
    {
      name: 'null values',
      obj: {
        stringValue: 'test',
        nullValue: null,
        nested: { anotherNull: null, validValue: 'valid' },
      },
      expected: {
        stringValue: 'test',
        nullValue: null,
        nested: { anotherNull: null, validValue: 'valid' },
      },
    },
    {
      name: 'undefined values',
      obj: {
        stringValue: 'test',
        undefinedValue: undefined,
        nested: { anotherUndefined: undefined, validValue: 'valid' },
      },
      expected: {
        stringValue: 'test',
        nested: { validValue: 'valid' },
      },
    },
    {
      name: 'mixed null and undefined values',
      obj: {
        nullValue: null,
        undefinedValue: undefined,
        validString: 'valid',
        validNumber: 42,
        nested: {
          nullInNested: null,
          undefinedInNested: undefined,
          validNested: 'nested valid',
        },
      },
      expected: {
        nullValue: null,
        validString: 'valid',
        validNumber: 42,
        nested: {
          nullInNested: null,
          validNested: 'nested valid',
        },
      },
    },
    {
      name: 'deeply nested null and undefined values',
      obj: {
        level1: {
          level2: {
            level3: {
              nullValue: null,
              undefinedValue: undefined,
              validValue: 'deeply nested',
              deeper: {
                level4: {
                  nullAtLevel4: null,
                  undefinedAtLevel4: undefined,
                },
              },
            },
          },
        },
      },
      expected: {
        level1: {
          level2: {
            level3: {
              nullValue: null,
              validValue: 'deeply nested',
              deeper: {
                level4: {
                  nullAtLevel4: null,
                },
              },
            },
          },
        },
      },
    },
  ])('handles $name', ({ name, obj, expected }) => {
    it(`handles ${name}`, () => {
      log.info(`test message with ${name}`, obj);
      expect(consoleSpies.spies.info).toHaveBeenCalledWith(
        formatExpected({
          logger: 'log',
          ts: expectedTimestamp,
          msg: `test message with ${name}`,
          obj: expected,
        })
      );
    });
  });

  it('logs axios response data for axios errors', async () => {
    vi.useRealTimers();

    const server = http.createServer((_req, res) => {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Internal Server Error' }));
    });

    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };

    try {
      await axios.get(`http://localhost:${port}`);
    } catch (error) {
      log.error('axios error', { error });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }

    const actualCall = consoleSpies.spies.error.mock.calls[0][0];
    const parsed = JSON.parse(actualCall as string);

    expect(parsed.logger).toBe('log');
    expect(parsed.ts).toMatch(TIMESTAMP_REGEX);
    expect(parsed.msg).toBe('axios error');
    expect(parsed.obj.error.name).toBe('AxiosError');
    expect(parsed.obj.error.message).toBe(
      'Request failed with status code 500'
    );
    expect(parsed.obj.error.responseData).toEqual({
      message: 'Internal Server Error',
    });
    expect(parsed.obj.error.stack).toContain(
      'AxiosError: Request failed with status code 500'
    );
  });

  it('maintains log entry order', () => {
    log.debug('first message');
    log.info('second message');
    log.warn('third message');
    log.error('fourth message');

    const debugCall = JSON.parse(
      consoleSpies.spies.debug.mock.calls[0][0] as string
    );
    const infoCall = JSON.parse(
      consoleSpies.spies.info.mock.calls[0][0] as string
    );
    const warnCall = JSON.parse(
      consoleSpies.spies.warn.mock.calls[0][0] as string
    );
    const errorCall = JSON.parse(
      consoleSpies.spies.error.mock.calls[0][0] as string
    );

    expect(debugCall).toMatchObject({
      logger: 'log',
      msg: 'first message',
    });
    expect(debugCall.ts).toMatch(TIMESTAMP_REGEX);

    expect(infoCall).toMatchObject({
      logger: 'log',
      msg: 'second message',
    });
    expect(infoCall.ts).toMatch(TIMESTAMP_REGEX);

    expect(warnCall).toMatchObject({
      logger: 'log',
      msg: 'third message',
    });
    expect(warnCall.ts).toMatch(TIMESTAMP_REGEX);

    expect(errorCall).toMatchObject({
      logger: 'log',
      msg: 'fourth message',
    });
    expect(errorCall.ts).toMatch(TIMESTAMP_REGEX);
  });

  it('handles concurrent logging without interleaving', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      Promise.resolve().then(() => log.info(`concurrent message ${i}`))
    );

    await Promise.all(promises);

    expect(consoleSpies.spies.info).toHaveBeenCalledTimes(10);

    // Verify all messages were logged
    for (let i = 0; i < 10; i++) {
      const actualCall = consoleSpies.spies.info.mock.calls[i][0];
      const parsed = JSON.parse(actualCall as string);

      expect(parsed).toMatchObject({
        logger: 'log',
        msg: `concurrent message ${i}`,
      });
      expect(parsed.ts).toMatch(TIMESTAMP_REGEX);
    }
  });
});

describe('createLogger', () => {
  let consoleSpies: ReturnType<typeof setupConsoleSpies>;
  let expectedTimestamp: string;

  beforeAll(() => {
    expectedTimestamp = mockSystemTime();
    consoleSpies = setupConsoleSpies();
  });

  beforeEach(() => {
    consoleSpies.reset();
  });

  afterAll(() => {
    vi.useRealTimers();
    consoleSpies.restore();
  });

  it('creates logger with default settings', () => {
    const logger = createLogger({ logger: 'test-logger' });

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(consoleSpies.spies.debug).toHaveBeenCalledWith(
      formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'debug message',
        obj: undefined,
      })
    );
    expect(consoleSpies.spies.info).toHaveBeenCalledWith(
      formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'info message',
        obj: undefined,
      })
    );
    expect(consoleSpies.spies.warn).toHaveBeenCalledWith(
      formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'warn message',
        obj: undefined,
      })
    );
    expect(consoleSpies.spies.error).toHaveBeenCalledWith(
      formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'error message',
        obj: undefined,
      })
    );
  });

  // Parameterized tests for log level filtering
  describe.each<{
    level: 'debug' | 'info' | 'warn' | 'error';
    shouldLog: string[];
  }>([
    { level: 'debug', shouldLog: ['debug', 'info', 'warn', 'error'] },
    { level: 'info', shouldLog: ['info', 'warn', 'error'] },
    { level: 'warn', shouldLog: ['warn', 'error'] },
    { level: 'error', shouldLog: ['error'] },
  ])('filters messages based on log level $level', ({ level, shouldLog }) => {
    it(`filters messages based on log level ${level}`, () => {
      const logger = createLogger({ logger: 'test-logger', level });

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      if (shouldLog.includes('debug')) {
        expect(consoleSpies.spies.debug).toHaveBeenCalled();
      } else {
        expect(consoleSpies.spies.debug).not.toHaveBeenCalled();
      }

      if (shouldLog.includes('info')) {
        expect(consoleSpies.spies.info).toHaveBeenCalled();
      } else {
        expect(consoleSpies.spies.info).not.toHaveBeenCalled();
      }

      if (shouldLog.includes('warn')) {
        expect(consoleSpies.spies.warn).toHaveBeenCalled();
      } else {
        expect(consoleSpies.spies.warn).not.toHaveBeenCalled();
      }

      if (shouldLog.includes('error')) {
        expect(consoleSpies.spies.error).toHaveBeenCalled();
      } else {
        expect(consoleSpies.spies.error).not.toHaveBeenCalled();
      }
    });
  });

  it('uses custom hooks', () => {
    const customHook = vi.fn();
    const logger = createLogger({ logger: 'test-logger', hooks: [customHook] });

    logger.info('test message', { key: 'value' });

    expect(customHook).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'info',
      msg: 'test message',
      obj: { key: 'value' },
      formatted: formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'test message',
        obj: { key: 'value' },
      }),
    });
  });

  it('uses multiple custom hooks', () => {
    const hook1 = vi.fn();
    const hook2 = vi.fn();
    const logger = createLogger({
      logger: 'test-logger',
      hooks: [hook1, hook2],
    });

    logger.warn('test message');

    const expectedCall = {
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'warn',
      msg: 'test message',
      obj: undefined,
      formatted: formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'test message',
        obj: undefined,
      }),
    };

    expect(hook1).toHaveBeenCalledWith(expectedCall);
    expect(hook2).toHaveBeenCalledWith(expectedCall);
  });

  it('handles hook errors gracefully', () => {
    const failingHook: LogHook = (_args) => {
      throw new Error('hook error');
    };
    const workingHook = vi.fn();
    const logger = createLogger({
      logger: 'test-logger',
      hooks: [failingHook, workingHook],
    });

    logger.info('test message');

    const actualCall = consoleSpies.spies.error.mock.calls[0][0];
    const parsed = JSON.parse(actualCall as string);

    expect(parsed).toEqual({
      ts: expect.stringMatching(TIMESTAMP_REGEX),
      msg: 'logger_hook_error',
      err: {
        name: 'Error',
        message: 'hook error',
        stack: expect.stringContaining('Error: hook error'),
      },
      obj: {
        failedHook: 'failingHook', // Function name is available
        originalEntry: {
          logger: 'test-logger',
          ts: expectedTimestamp,
          level: 'info',
          msg: 'test message',
          obj: undefined,
          formatted: formatExpected({
            logger: 'test-logger',
            ts: expectedTimestamp,
            msg: 'test message',
            obj: undefined,
          }),
        },
      },
    });
    expect(workingHook).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'info',
      msg: 'test message',
      obj: undefined,
      formatted: formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'test message',
        obj: undefined,
      }),
    });
  });

  it('handles hooks that return rejecting promises', async () => {
    const rejectingHook: LogHook = () => {
      throw new Error('async hook error');
    };
    const workingHook = vi.fn();
    const logger = createLogger({
      logger: 'test-logger',
      hooks: [rejectingHook, workingHook],
    });

    await logger.info('test message');

    const actualCall = consoleSpies.spies.error.mock.calls[0][0];
    const parsed = JSON.parse(actualCall as string);

    expect(parsed).toEqual({
      ts: expect.stringMatching(TIMESTAMP_REGEX),
      msg: 'logger_hook_error',
      err: {
        name: 'Error',
        message: 'async hook error',
        stack: expect.stringContaining('Error: async hook error'),
      },
      obj: {
        failedHook: 'rejectingHook',
        originalEntry: {
          logger: 'test-logger',
          ts: expectedTimestamp,
          level: 'info',
          msg: 'test message',
          obj: undefined,
          formatted: formatExpected({
            logger: 'test-logger',
            ts: expectedTimestamp,
            msg: 'test message',
            obj: undefined,
          }),
        },
      },
    });
    expect(workingHook).toHaveBeenCalled();
  });

  it('handles all log levels correctly', () => {
    const logger = createLogger({ logger: 'test-logger' });

    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('error');

    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('handles objects with errors in custom hooks', () => {
    const customHook = vi.fn();
    const logger = createLogger({ logger: 'test-logger', hooks: [customHook] });
    const testError = new Error('test error');

    logger.error('error message', { error: testError });

    const actualCall = customHook.mock.calls[0][0];

    expect(actualCall.logger).toBe('test-logger');
    expect(actualCall.ts).toBe(expectedTimestamp);
    expect(actualCall.level).toBe('error');
    expect(actualCall.msg).toBe('error message');
    expect(actualCall.obj).toEqual({ error: testError });

    const formattedParsed = JSON.parse(actualCall.formatted);
    expect(formattedParsed.logger).toBe('test-logger');
    expect(formattedParsed.ts).toBe(expectedTimestamp);
    expect(formattedParsed.msg).toBe('error message');
    expect(formattedParsed.obj.error.name).toBe('Error');
    expect(formattedParsed.obj.error.message).toBe('test error');
    expect(formattedParsed.obj.error.stack).toContain('Error: test error');
  });

  it('creates logger with no hooks', () => {
    const logger = createLogger({ logger: 'test-logger', hooks: [] });

    logger.info('test message');

    expect(consoleSpies.spies.info).not.toHaveBeenCalled();
  });

  it('supports asynchronous hooks', async () => {
    const asyncHook = vi.fn().mockResolvedValue(undefined);
    const logger = createLogger({ logger: 'test-logger', hooks: [asyncHook] });

    await logger.info('async hook message', { async: true });

    expect(asyncHook).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'info',
      msg: 'async hook message',
      obj: { async: true },
      formatted: formatExpected({
        logger: 'test-logger',
        ts: expectedTimestamp,
        msg: 'async hook message',
        obj: { async: true },
      }),
    });

    // Ensure default console hook is overridden
    expect(consoleSpies.spies.info).not.toHaveBeenCalled();
  });

  // Parameterized tests for different logger names
  describe.each<{ name: string; loggerName: string }>([
    { name: 'api', loggerName: 'api' },
    { name: 'database', loggerName: 'database' },
    { name: 'auth', loggerName: 'auth' },
  ])('creates logger with name $name', ({ name, loggerName }) => {
    it(`creates logger with name ${name}`, () => {
      const logger = createLogger({ logger: loggerName });
      logger.info(`${name} message`);

      expect(consoleSpies.spies.info).toHaveBeenCalledWith(
        formatExpected({
          logger: loggerName,
          ts: expectedTimestamp,
          msg: `${name} message`,
          obj: undefined,
        })
      );
    });
  });

  it('creates multiple loggers with different names', () => {
    const apiLogger = createLogger({ logger: 'api' });
    const dbLogger = createLogger({ logger: 'database' });
    const authLogger = createLogger({ logger: 'auth' });

    apiLogger.info('api message');
    dbLogger.info('db message');
    authLogger.info('auth message');

    expect(consoleSpies.spies.info).toHaveBeenNthCalledWith(
      1,
      formatExpected({
        logger: 'api',
        ts: expectedTimestamp,
        msg: 'api message',
        obj: undefined,
      })
    );
    expect(consoleSpies.spies.info).toHaveBeenNthCalledWith(
      2,
      formatExpected({
        logger: 'database',
        ts: expectedTimestamp,
        msg: 'db message',
        obj: undefined,
      })
    );
    expect(consoleSpies.spies.info).toHaveBeenNthCalledWith(
      3,
      formatExpected({
        logger: 'auth',
        ts: expectedTimestamp,
        msg: 'auth message',
        obj: undefined,
      })
    );
  });

  it('handles concurrent logging with multiple loggers', async () => {
    const logger1 = createLogger({ logger: 'logger1' });
    const logger2 = createLogger({ logger: 'logger2' });

    const promises = [
      ...Array.from({ length: 5 }, (_, i) =>
        Promise.resolve().then(() => logger1.info(`logger1 message ${i}`))
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        Promise.resolve().then(() => logger2.warn(`logger2 message ${i}`))
      ),
    ];

    await Promise.all(promises);

    expect(consoleSpies.spies.info).toHaveBeenCalledTimes(5);
    expect(consoleSpies.spies.warn).toHaveBeenCalledTimes(5);

    // Verify logger1 messages
    for (let i = 0; i < 5; i++) {
      expect(consoleSpies.spies.info).toHaveBeenNthCalledWith(
        i + 1,
        formatExpected({
          logger: 'logger1',
          ts: expectedTimestamp,
          msg: `logger1 message ${i}`,
          obj: undefined,
        })
      );
    }

    // Verify logger2 messages
    for (let i = 0; i < 5; i++) {
      expect(consoleSpies.spies.warn).toHaveBeenNthCalledWith(
        i + 1,
        formatExpected({
          logger: 'logger2',
          ts: expectedTimestamp,
          msg: `logger2 message ${i}`,
          obj: undefined,
        })
      );
    }
  });
});

describe('serializeError', () => {
  it('serialises primitive values', () => {
    const result = serializeError('oops');
    expect(result).toEqual({ name: 'NonError', message: 'oops' });
  });

  it('copies enumerable properties from Error instances', () => {
    const errWithCode = Object.assign(new Error('boom'), { code: 'E_BROKEN' });

    const result = serializeError(errWithCode);
    expect(result).toMatchObject({
      name: 'Error',
      message: 'boom',
      code: 'E_BROKEN',
    });
  });

  it('recursively serialises causes', () => {
    const inner = new Error('inner');
    const outer: Error & { cause?: unknown } = new Error('outer');
    outer.cause = inner;

    const result = serializeError(outer);
    expect(result).toMatchObject({
      name: 'Error',
      message: 'outer',
      cause: {
        name: 'Error',
        message: 'inner',
      },
    });
  });
});
