import { MaxIterationsError, ToolError } from './errors.js';

export class Agent {
  constructor({ provider, systemPrompt = '', tools = [], maxIterations = 10 }) {
    if (!provider) throw new TypeError('Agent requires a "provider".');
    this.provider = provider;
    this.systemPrompt = systemPrompt;
    this.tools = tools;
    this.toolsByName = new Map(tools.map((t) => [t.name, t]));
    this.maxIterations = maxIterations;
  }

  async run(userMessage, { onStep } = {}) {
    const messages = [];
    if (this.systemPrompt) messages.push({ role: 'system', content: this.systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    for (let iteration = 1; iteration <= this.maxIterations; iteration++) {
      const { content, toolCalls, assistantMessage } = await this.provider.chat({
        messages,
        tools: this.tools,
      });

      messages.push(
        assistantMessage ?? {
          role: 'assistant',
          content,
          ...(toolCalls.length > 0 && {
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: JSON.stringify(tc.args) },
            })),
          }),
        },
      );

      if (onStep) await onStep({ iteration, content, toolCalls });

      if (toolCalls.length === 0) {
        return { finalMessage: content, messages, iterations: iteration };
      }

      for (const call of toolCalls) {
        const tool = this.toolsByName.get(call.name);
        let resultContent;
        if (!tool) {
          resultContent = JSON.stringify({ error: `Unknown tool: ${call.name}` });
        } else {
          try {
            const output = await tool.call(call.args);
            resultContent = typeof output === 'string' ? output : JSON.stringify(output);
          } catch (err) {
            if (err instanceof ToolError) {
              resultContent = JSON.stringify({ error: err.message });
            } else {
              throw err;
            }
          }
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: resultContent,
        });
      }
    }

    throw new MaxIterationsError(this.maxIterations, messages);
  }
}
