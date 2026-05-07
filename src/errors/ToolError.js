export class ToolError extends Error {
  constructor(message, { toolName, phase, cause } = {}) {
    super(message);
    this.name = 'ToolError';
    this.toolName = toolName;
    this.phase = phase;
    if (cause !== undefined) this.cause = cause;
  }
}
