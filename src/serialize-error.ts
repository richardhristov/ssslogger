export type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
  [key: string]: unknown;
};

/**
 * Very small subset of [`serialize-error`](https://github.com/sindresorhus/serialize-error).
 * Converts an `Error` instance into a plain JSON-serialisable object.
 *
 * Only properties actually present on the error instance are copied, so the
 * output size stays minimal.  Nested `cause` chains are handled recursively.
 */
export function serializeError(err: unknown) {
  if (!(err instanceof Error)) {
    return {
      name: 'NonError',
      message: String(err),
    };
  }

  const serialized: SerializedError = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };

  // Copy enumerable own properties (e.g. `code`, `status`, …)
  for (const [key, value] of Object.entries(err)) {
    // Avoid overwriting core fields we already set
    if (key in serialized) {
      continue;
    }
    serialized[key] = value;
  }

  // Handle `cause`, introduced in Node 16+
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- dynamic property access
  const cause = (err as unknown as { cause?: unknown }).cause;
  if (cause !== undefined) {
    serialized.cause = cause instanceof Error ? serializeError(cause) : cause;
  }

  return serialized;
}
