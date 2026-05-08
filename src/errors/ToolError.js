/**
 * Thrown by `Tool.call`. The `phase` field tells you where it failed:
 * `'input'`  — input validation against `inputSchema`
 * `'handler'` — the tool's handler function threw
 * `'output'` — output validation against `outputSchema`
 *
 * The Agent loop catches `ToolError` and feeds the message back to the model
 * so it can correct itself; only unexpected errors propagate.
 */
export class ToolError extends Error {
  /**
   * @param {string} message
   * @param {{ toolName?: string, phase?: 'input'|'handler'|'output', cause?: any }=} details
   */
  constructor(message, { toolName, phase, cause } = {}) {
    super(message);
    this.name = 'ToolError';
    this.toolName = toolName;
    this.phase = phase;
    if (cause !== undefined) this.cause = cause;
  }
}
