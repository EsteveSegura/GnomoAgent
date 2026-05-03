import { Provider } from './Provider.js';
import { ProviderError } from '../errors.js';

export class OpenAIProvider extends Provider {
  constructor({
    apiKey,
    model = 'gpt-4o-mini',
    baseURL = 'https://api.openai.com/v1',
    fetchImpl = globalThis.fetch,
    extraBody = {},
  } = {}) {
    super();
    if (!apiKey) throw new TypeError('OpenAIProvider requires "apiKey".');
    if (!fetchImpl) throw new TypeError('No fetch implementation available (Node 18+ required).');
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = baseURL;
    this.fetchImpl = fetchImpl;
    this.extraBody = extraBody;
  }

  async chat({ messages, tools = [] }) {
    const body = {
      model: this.model,
      messages,
      ...this.extraBody,
    };
    if (tools.length > 0) {
      body.tools = tools.map((t) => ({ type: 'function', function: t.toProviderSchema() }));
    }

    const fetchImpl = this.fetchImpl;
    const res = await fetchImpl(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ProviderError(`OpenAI API error ${res.status}: ${text}`, {
        status: res.status,
        body: text,
      });
    }

    const json = await res.json();
    const message = json?.choices?.[0]?.message;
    if (!message) {
      throw new ProviderError('OpenAI response missing choices[0].message.', { body: json });
    }

    const toolCalls = (message.tool_calls || []).map((tc) => {
      let args = {};
      try {
        args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch (err) {
        throw new ProviderError(
          `Failed to parse tool call arguments for "${tc.function?.name}": ${err.message}`,
          { cause: err },
        );
      }
      return { id: tc.id, name: tc.function?.name, args, raw: tc };
    });

    return {
      content: message.content ?? '',
      toolCalls,
      assistantMessage: message,
      raw: json,
    };
  }
}
