/**
 * Thrown by `Provider` implementations on transport / wire-format failures
 * (HTTP non-2xx, malformed response, unparseable tool call arguments, etc.).
 */
export class ProviderError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, body?: any, cause?: any }=} details
   */
  constructor(message, { status, body, cause } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.body = body;
    if (cause !== undefined) this.cause = cause;
  }
}
