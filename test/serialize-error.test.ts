import { describe, expect, it } from 'vitest';
import { serializeError } from '../src/serialize-error';

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
