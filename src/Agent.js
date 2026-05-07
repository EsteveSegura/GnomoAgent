import { MaxIterationsError, ToolError } from './errors/index.js';

function buildInitialMessages(systemPrompt, userMessage) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

function toOpenAIToolCalls(toolCalls) {
  return toolCalls.map((tc) => ({
    id: tc.id,
    type: 'function',
    function: { name: tc.name, arguments: JSON.stringify(tc.args) },
  }));
}

function assistantMessageFromResponse({ content, toolCalls, assistantMessage }) {
  if (assistantMessage) return assistantMessage;
  const message = { role: 'assistant', content };
  if (toolCalls.length > 0) message.tool_calls = toOpenAIToolCalls(toolCalls);
  return message;
}

function formatToolOutput(output) {
  return typeof output === 'string' ? output : JSON.stringify(output);
}

function errorPayload(message) {
  return JSON.stringify({ error: message });
}

function toolResultMessage(callId, content) {
  return { role: 'tool', tool_call_id: callId, content };
}

export class Agent {
  constructor({ provider, systemPrompt = '', tools = [], maxIterations = 10 }) {
    if (!provider) throw new TypeError('Agent requires a "provider".');
    this.provider = provider;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.toolsByName = new Map(tools.map((t) => [t.name, t]));
    this.maxIterations = maxIterations;
  }

  async _executeToolCall(call) {
    const tool = this.toolsByName.get(call.name);
    if (!tool) {
      return toolResultMessage(call.id, errorPayload(`Unknown tool: ${call.name}`));
    }
    try {
      const output = await tool.call(call.args);
      return toolResultMessage(call.id, formatToolOutput(output));
    } catch (err) {
      if (err instanceof ToolError) {
        return toolResultMessage(call.id, errorPayload(err.message));
      }
      throw err;
    }
  }

  async run(userMessage, { onStep } = {}) {
    const messages = buildInitialMessages(this.systemPrompt, userMessage);

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      const response = await this.provider.chat({ messages, tools: this.tools });
      const { content, toolCalls } = response;

      messages.push(assistantMessageFromResponse(response));

      if (onStep) await onStep({ iteration, content, toolCalls });

      if (toolCalls.length === 0) {
        return { finalMessage: content, messages, iterations: iteration };
      }

      for (const call of toolCalls) {
        messages.push(await this._executeToolCall(call));
      }
    }

    throw new MaxIterationsError(this.maxIterations, messages);
  }
}
