export class ValidationError extends Error {
  constructor(message, { path = '', value } = {}) {
    super(message);
    this.name = 'ValidationError';
    this.path = path;
    this.value = value;
  }
}

export class ToolError extends Error {
  constructor(message, { toolName, phase, cause } = {}) {
    super(message);
    this.name = 'ToolError';
    this.toolName = toolName;
    this.phase = phase;
    if (cause !== undefined) this.cause = cause;
  }
}

export class MaxIterationsError extends Error {
  constructor(maxIterations, messages) {
    super(`Agent exceeded maxIterations (${maxIterations}) without producing a final answer.`);
    this.name = 'MaxIterationsError';
    this.maxIterations = maxIterations;
    this.messages = messages;
  }
}

export class ProviderError extends Error {
  constructor(message, { status, body, cause } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.body = body;
    if (cause !== undefined) this.cause = cause;
  }
}
