import { Provider } from './Provider.js';
import { ProviderError } from '../errors/index.js';

const CHAT_COMPLETIONS_PATH = '/chat/completions';

function buildAuthHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
}

function buildRequestBody({ model, messages, tools, extraBody }) {
  const body = { model, messages, ...extraBody };
  if (tools.length > 0) {
    body.tools = tools.map((t) => ({ type: 'function', function: t.toProviderSchema() }));
  }
  return body;
}

async function postChatCompletion(fetchImpl, url, headers, body) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError(`OpenAI API error ${res.status}: ${text}`, {
      status: res.status,
      body: text,
    });
  }
  return res.json();
}

function extractAssistantMessage(json) {
  const message = json?.choices?.[0]?.message;
  if (!message) {
    throw new ProviderError('OpenAI response missing choices[0].message.', { body: json });
  }
  return message;
}

function parseToolCallArguments(name, raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new ProviderError(
      `Failed to parse tool call arguments for "${name}": ${err.message}`,
      { cause: err },
    );
  }
}

function parseToolCalls(rawToolCalls) {
  return (rawToolCalls ?? []).map((tc) => ({
    id: tc.id,
    name: tc.function?.name,
    args: parseToolCallArguments(tc.function?.name, tc.function?.arguments),
    raw: tc,
  }));
}

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
    const body = buildRequestBody({
      model: this.model,
      messages,
      tools,
      extraBody: this.extraBody,
    });

    const fetchImpl = this.fetchImpl;
    const url = `${this.baseURL}${CHAT_COMPLETIONS_PATH}`;
    const json = await postChatCompletion(fetchImpl, url, buildAuthHeaders(this.apiKey), body);

    const message = extractAssistantMessage(json);
    return {
      content: message.content ?? '',
      toolCalls: parseToolCalls(message.tool_calls),
      assistantMessage: message,
      raw: json,
    };
  }
}
