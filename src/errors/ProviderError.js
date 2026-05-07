export class ProviderError extends Error {
  constructor(message, { status, body, cause } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.body = body;
    if (cause !== undefined) this.cause = cause;
  }
}
