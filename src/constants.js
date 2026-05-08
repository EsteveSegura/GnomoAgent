export const ROLE = Object.freeze({
  SYSTEM: 'system',
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
});

export const TOOL_TYPE = Object.freeze({
  FUNCTION: 'function',
});

export const TOOL_PHASE = Object.freeze({
  INPUT: 'input',
  HANDLER: 'handler',
  OUTPUT: 'output',
});
