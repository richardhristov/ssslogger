/** biome-ignore-all lint/suspicious/noConsole: test */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger, type LogHook, log } from '../src/index';

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
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('test message with error')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('test error')
    );
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
      expect.stringContaining('test message with circular reference')
    );
    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('value'));
  });

  it('handles logger errors gracefully', () => {
    const badObj = {
      get throwsError() {
        throw new Error('test logger error');
      },
    };

    log.info('test message with bad object', badObj);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('logger_error')
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('test message with bad object')
    );
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
      expect.stringContaining('test message with null values')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('nullValue')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('anotherNull')
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
      expect.stringContaining('test message with undefined values')
    );
    // JSON.stringify omits undefined values, so they should not appear in output
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('stringValue')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('validValue')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('undefinedValue')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('anotherUndefined')
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
      expect.stringContaining('test message with mixed null/undefined')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('nullValue')
    );
    // JSON.stringify omits undefined values, so they should not appear in output
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('undefinedValue')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('validString')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('validNumber')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('nullInNested')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('undefinedInNested')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('validNested')
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
      expect.stringContaining(
        'test message with deeply nested nulls/undefineds'
      )
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('nullValue')
    );
    // JSON.stringify omits undefined values, so they should not appear in output
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('undefinedValue')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('validValue')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('nullAtLevel4')
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.not.stringContaining('undefinedAtLevel4')
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

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('logger_hook_error')
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('hook error')
    );
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

    expect(customHook).toHaveBeenCalledWith({
      logger: 'test-logger',
      ts: expectedTimestamp,
      level: 'error',
      msg: 'error message',
      obj: { error: testError },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      formatted: expect.stringContaining('error message'),
    });
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
