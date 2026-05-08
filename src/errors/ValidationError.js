/**
 * Thrown by `validate` when a value does not match its JSON Schema.
 * Caught by `Tool` and re-wrapped as `ToolError`.
 */
export class ValidationError extends Error {
  /**
   * @param {string} message
   * @param {{ path?: string, value?: any }=} details
   */
  constructor(message, { path = '', value } = {}) {
    super(message);
    this.name = 'ValidationError';
    this.path = path;
    this.value = value;
  }
}
