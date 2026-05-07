import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OpenAIProvider } from '../../src/providers/OpenAIProvider.js';
import { Tool } from '../../src/Tool.js';
import { ProviderError } from '../../src/errors/index.js';

const fakeResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  async json() {
    return body;
  },
  async text() {
    return typeof body === 'string' ? body : JSON.stringify(body);
  },
});

test('OpenAIProvider: requires apiKey', () => {
  assert.throws(() => new OpenAIProvider({}), TypeError);
});

test('OpenAIProvider: sends auth header, model, messages, and tool list', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return fakeResponse({
      choices: [{ message: { role: 'assistant', content: 'hi', tool_calls: null } }],
    });
  };
  const tool = new Tool({
    name: 'add',
    description: 'add two',
    inputSchema: { type: 'object', properties: { a: { type: 'number' } }, required: ['a'] },
    handler: async () => ({}),
  });
  const provider = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-test', fetchImpl });
  const result = await provider.chat({
    messages: [{ role: 'user', content: 'hello' }],
    tools: [tool],
  });

  assert.equal(captured.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers.Authorization, 'Bearer sk-test');
  const body = JSON.parse(captured.init.body);
  assert.equal(body.model, 'gpt-test');
  assert.equal(body.messages[0].content, 'hello');
  assert.equal(body.tools[0].type, 'function');
  assert.equal(body.tools[0].function.name, 'add');
  assert.equal(result.content, 'hi');
  assert.deepEqual(result.toolCalls, []);
});

test('OpenAIProvider: omits tools field when none provided', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = JSON.parse(init.body);
    return fakeResponse({ choices: [{ message: { content: 'ok' } }] });
  };
  const provider = new OpenAIProvider({ apiKey: 'sk', fetchImpl });
  await provider.chat({ messages: [{ role: 'user', content: 'x' }] });
  assert.ok(!('tools' in captured), 'tools key should not be present');
});

test('OpenAIProvider: parses tool_calls and JSON-decodes arguments', async () => {
  const fetchImpl = async () =>
    fakeResponse({
      choices: [
        {
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [
              {
                id: 'call_1',
                type: 'function',
                function: { name: 'add', arguments: '{"a":1,"b":2}' },
              },
            ],
          },
        },
      ],
    });
  const provider = new OpenAIProvider({ apiKey: 'sk', fetchImpl });
  const r = await provider.chat({ messages: [], tools: [] });
  assert.equal(r.toolCalls.length, 1);
  assert.equal(r.toolCalls[0].id, 'call_1');
  assert.equal(r.toolCalls[0].name, 'add');
  assert.deepEqual(r.toolCalls[0].args, { a: 1, b: 2 });
});

test('OpenAIProvider: throws ProviderError on HTTP error', async () => {
  const fetchImpl = async () => fakeResponse('rate limited', { ok: false, status: 429 });
  const provider = new OpenAIProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(provider.chat({ messages: [] }), (err) => {
    return err instanceof ProviderError && err.status === 429;
  });
});

test('OpenAIProvider: throws ProviderError on malformed tool call arguments', async () => {
  const fetchImpl = async () =>
    fakeResponse({
      choices: [
        {
          message: {
            tool_calls: [{ id: 'c1', function: { name: 'add', arguments: 'not json' } }],
          },
        },
      ],
    });
  const provider = new OpenAIProvider({ apiKey: 'sk', fetchImpl });
  await assert.rejects(provider.chat({ messages: [] }), ProviderError);
});

test('OpenAIProvider: respects extraBody and custom baseURL', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url, body: JSON.parse(init.body) };
    return fakeResponse({ choices: [{ message: { content: 'ok' } }] });
  };
  const provider = new OpenAIProvider({
    apiKey: 'sk',
    baseURL: 'https://example.test/v1',
    extraBody: { temperature: 0.2, top_p: 0.9 },
    fetchImpl,
  });
  await provider.chat({ messages: [] });
  assert.equal(captured.url, 'https://example.test/v1/chat/completions');
  assert.equal(captured.body.temperature, 0.2);
  assert.equal(captured.body.top_p, 0.9);
});
