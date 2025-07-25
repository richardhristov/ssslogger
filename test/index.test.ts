/** biome-ignore-all lint/suspicious/noConsole: test */

import http from 'node:http';
import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, type LogHook, log } from '../src/index';

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
  const mockDate = new Date('2024-03-25T12:00:00.000Z');
  const expectedTimestamp = mockDate.toISOString();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    vi.spyOn(console, 'debug').mockImplementation(() => {
      return;
    });
    vi.spyOn(console, 'info').mockImplementation(() => {
      return;
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    });
    vi.spyOn(console, 'error').mockImplementation(() => {
      return;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('logs debug messages', () => {
    log.debug('test debug message');
    expect(console.debug).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test debug message',
          obj: undefined,
        },
        null,
        2
      )
    );
  });

  it('logs info messages', () => {
    log.info('test info message');
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test info message',
          obj: undefined,
        },
        null,
        2
      )
    );
  });

  it('logs warn messages', () => {
    log.warn('test warn message');
    expect(console.warn).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test warn message',
          obj: undefined,
        },
        null,
        2
      )
    );
  });

  it('logs error messages', () => {
    log.error('test error message');
    expect(console.error).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test error message',
          obj: undefined,
        },
        null,
        2
      )
    );
  });

  it('logs messages with objects', () => {
    const testObj = { key: 'value' };
    log.info('test message with object', testObj);
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test message with object',
          obj: testObj,
        },
        null,
        2
      )
    );
  });

  it('handles errors in objects', () => {
    const testError = new Error('test error');
    log.info('test message with error', { error: testError });

    const actualCall = vi.mocked(console.info).mock.calls[0][0];
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
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test message with circular reference',
          obj: {
            key: 'value',
            self: undefined, // Circular reference gets omitted
          },
        },
        null,
        2
      )
    );
  });

  it('handles logger errors gracefully', () => {
    const badObj = {
      get throwsError() {
        throw new Error('test logger error');
      },
    };

    log.info('test message with bad object', badObj);

    const actualCall = vi.mocked(console.error).mock.calls[0][0];
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

  it('handles null values in objects', () => {
    const objWithNull = {
      stringValue: 'test',
      nullValue: null,
      nested: {
        anotherNull: null,
        validValue: 'valid',
      },
    };

    log.info('test message with null values', objWithNull);
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test message with null values',
          obj: objWithNull,
        },
        null,
        2
      )
    );
  });

  it('handles undefined values in objects', () => {
    const objWithUndefined = {
      stringValue: 'test',
      undefinedValue: undefined,
      nested: {
        anotherUndefined: undefined,
        validValue: 'valid',
      },
    };

    log.info('test message with undefined values', objWithUndefined);
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test message with undefined values',
          obj: {
            stringValue: 'test',
            nested: {
              validValue: 'valid',
            },
          },
        },
        null,
        2
      )
    );
  });

  it('handles mixed null and undefined values', () => {
    const mixedObj = {
      nullValue: null,
      undefinedValue: undefined,
      validString: 'valid',
      validNumber: 42,
      nested: {
        nullInNested: null,
        undefinedInNested: undefined,
        validNested: 'nested valid',
      },
    };

    log.info('test message with mixed null/undefined', mixedObj);
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test message with mixed null/undefined',
          obj: {
            nullValue: null,
            validString: 'valid',
            validNumber: 42,
            nested: {
              nullInNested: null,
              validNested: 'nested valid',
            },
          },
        },
        null,
        2
      )
    );
  });

  it('handles deeply nested null and undefined values', () => {
    const deeplyNested = {
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
    };

    log.info('test message with deeply nested nulls/undefineds', deeplyNested);
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'log',
          ts: expectedTimestamp,
          msg: 'test message with deeply nested nulls/undefineds',
          obj: {
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
        null,
        2
      )
    );
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

    const actualCall = vi.mocked(console.error).mock.calls[0][0];
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
});

describe('createLogger', () => {
  const mockDate = new Date('2024-03-25T12:00:00.000Z');
  const expectedTimestamp = mockDate.toISOString();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
    vi.spyOn(console, 'debug').mockImplementation(() => {
      return;
    });
    vi.spyOn(console, 'info').mockImplementation(() => {
      return;
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {
      return;
    });
    vi.spyOn(console, 'error').mockImplementation(() => {
      return;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('creates logger with default settings', () => {
    const logger = createLogger({ logger: 'test-logger' });

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(console.debug).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'debug message',
          obj: undefined,
        },
        null,
        2
      )
    );
    expect(console.info).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'info message',
          obj: undefined,
        },
        null,
        2
      )
    );
    expect(console.warn).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'warn message',
          obj: undefined,
        },
        null,
        2
      )
    );
    expect(console.error).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'error message',
          obj: undefined,
        },
        null,
        2
      )
    );
  });

  it('filters messages based on log level', () => {
    const logger = createLogger({ logger: 'test-logger', level: 'warn' });

    logger.debug('debug message');
    logger.info('info message');
    logger.warn('warn message');
    logger.error('error message');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'warn message',
          obj: undefined,
        },
        null,
        2
      )
    );
    expect(console.error).toHaveBeenCalledWith(
      JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'error message',
          obj: undefined,
        },
        null,
        2
      )
    );
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
      formatted: JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'test message',
          obj: { key: 'value' },
        },
        null,
        2
      ),
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

    expect(hook1).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'warn',
      msg: 'test message',
      obj: undefined,
      formatted: JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'test message',
          obj: undefined,
        },
        null,
        2
      ),
    });
    expect(hook2).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'warn',
      msg: 'test message',
      obj: undefined,
      formatted: JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'test message',
          obj: undefined,
        },
        null,
        2
      ),
    });
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

    const actualCall = vi.mocked(console.error).mock.calls[0][0];
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
          formatted: JSON.stringify(
            {
              logger: 'test-logger',
              ts: expectedTimestamp,
              msg: 'test message',
              obj: undefined,
            },
            null,
            2
          ),
        },
      },
    });
    expect(workingHook).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'info',
      msg: 'test message',
      obj: undefined,
      formatted: JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'test message',
          obj: undefined,
        },
        null,
        2
      ),
    });
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

  it('works with different log level configurations', () => {
    const debugLogger = createLogger({
      logger: 'debug-logger',
      level: 'debug',
    });
    const infoLogger = createLogger({ logger: 'info-logger', level: 'info' });
    const warnLogger = createLogger({ logger: 'warn-logger', level: 'warn' });
    const errorLogger = createLogger({
      logger: 'error-logger',
      level: 'error',
    });

    debugLogger.debug('debug message');
    expect(console.debug).toHaveBeenCalled();

    vi.clearAllMocks();
    infoLogger.debug('debug message');
    expect(console.debug).not.toHaveBeenCalled();

    vi.clearAllMocks();
    warnLogger.info('info message');
    expect(console.info).not.toHaveBeenCalled();

    vi.clearAllMocks();
    errorLogger.warn('warn message');
    expect(console.warn).not.toHaveBeenCalled();
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

    expect(console.info).not.toHaveBeenCalled();
  });

  it('supports asynchronous hooks', () => {
    const asyncHook = vi.fn().mockResolvedValue(undefined);
    const logger = createLogger({ logger: 'test-logger', hooks: [asyncHook] });

    logger.info('async hook message', { async: true });

    expect(asyncHook).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'info',
      msg: 'async hook message',
      obj: { async: true },
      formatted: JSON.stringify(
        {
          logger: 'test-logger',
          ts: expectedTimestamp,
          msg: 'async hook message',
          obj: { async: true },
        },
        null,
        2
      ),
    });

    // Ensure default console hook is overridden
    expect(console.info).not.toHaveBeenCalled();
  });

  it('creates logger with different names', () => {
    const apiLogger = createLogger({ logger: 'api' });
    const dbLogger = createLogger({ logger: 'database' });
    const authLogger = createLogger({ logger: 'auth' });

    apiLogger.info('api message');
    dbLogger.info('db message');
    authLogger.info('auth message');

    expect(console.info).toHaveBeenNthCalledWith(
      1,
      JSON.stringify(
        {
          logger: 'api',
          ts: expectedTimestamp,
          msg: 'api message',
          obj: undefined,
        },
        null,
        2
      )
    );
    expect(console.info).toHaveBeenNthCalledWith(
      2,
      JSON.stringify(
        {
          logger: 'database',
          ts: expectedTimestamp,
          msg: 'db message',
          obj: undefined,
        },
        null,
        2
      )
    );
    expect(console.info).toHaveBeenNthCalledWith(
      3,
      JSON.stringify(
        {
          logger: 'auth',
          ts: expectedTimestamp,
          msg: 'auth message',
          obj: undefined,
        },
        null,
        2
      )
    );
  });
});
