import { MaxIterationsError, ToolError } from './errors/index.js';
import { ROLE } from './constants.js';

function buildInitialMessages(systemPrompt, userMessage) {
  const messages = [];
  if (systemPrompt) messages.push({ role: ROLE.SYSTEM, content: systemPrompt });
  messages.push({ role: ROLE.USER, content: userMessage });
  return messages;
}

function assistantMessage({ content, toolCalls }) {
  const msg = { role: ROLE.ASSISTANT, content };
  if (toolCalls.length > 0) msg.toolCalls = toolCalls;
  return msg;
}

function formatToolOutput(output) {
  return typeof output === 'string' ? output : JSON.stringify(output);
}

function errorPayload(message) {
  return JSON.stringify({ error: message });
}

function toolResultMessage(callId, content, name) {
  const msg = { role: ROLE.TOOL, toolCallId: callId, content };
  if (name) msg.name = name;
  return msg;
}

/**
 * Drives a chat-completion model through a tool-calling reasoning loop.
 *
 * The loop exits when the model produces a response with no tool calls
 * (natural stop) or when `maxIterations` is reached (throws `MaxIterationsError`).
 *
 * @example
 *   const agent = new Agent({
 *     provider: new OpenAIProvider({ apiKey: '...' }),
 *     systemPrompt: 'You are helpful.',
 *     tools: [myTool],
 *   });
 *   const { finalMessage } = await agent.run('hello');
 */
export class Agent {
  /**
   * @param {Object} opts
   * @param {import('./providers/Provider.js').Provider} opts.provider
   * @param {string=} opts.systemPrompt
   * @param {import('./Tool.js').Tool[]=} opts.tools
   * @param {number=} opts.maxIterations - Hard cap on provider chats. Defaults to 10.
   */
  constructor({ provider, systemPrompt = '', tools = [], maxIterations = 10 }) {
    if (!provider) throw new TypeError('Agent requires a "provider".');
    this.provider = provider;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.toolsByName = new Map(tools.map((t) => [t.name, t]));
    this.maxIterations = maxIterations;
  }

  /**
   * Executes a single tool call from the model and produces a canonical
   * `tool` message to feed back into the conversation.
   *
   * @private
   * @param {import('./types.js').ToolCall} call
   * @returns {Promise<import('./types.js').ToolMessage>}
   */
  async _executeToolCall(call) {
    const tool = this.toolsByName.get(call.name);
    if (!tool) {
      return toolResultMessage(call.id, errorPayload(`Unknown tool: ${call.name}`), call.name);
    }
    try {
      const output = await tool.call(call.args);
      return toolResultMessage(call.id, formatToolOutput(output), call.name);
    } catch (err) {
      if (err instanceof ToolError) {
        return toolResultMessage(call.id, errorPayload(err.message), call.name);
      }
      throw err;
    }
  }

  /**
   * Runs the reasoning loop for a single user turn.
   *
   * @param {string} userMessage
   * @param {Object=} options
   * @param {(event: import('./types.js').OnStepEvent) => (void|Promise<void>)=} options.onStep
   *        Called once per loop iteration after the assistant message is appended.
   * @returns {Promise<import('./types.js').AgentRunResult>}
   * @throws {MaxIterationsError} when `maxIterations` is exceeded.
   */
  async run(userMessage, { onStep } = {}) {
    const messages = buildInitialMessages(this.systemPrompt, userMessage);

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      const response = await this.provider.chat({ messages, tools: this.tools });
      const { content, toolCalls } = response;

      messages.push(assistantMessage(response));

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
