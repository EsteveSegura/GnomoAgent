import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Agent, Tool, Provider } from '../../src/index.js';

// ---------------------------------------------------------------------------
// Generic text-processing tools — chosen to be totally unrelated to any real
// domain so this file clearly tests the agent loop mechanics, not a use case.
// ---------------------------------------------------------------------------

const stringInput = (...keys) => ({
  type: 'object',
  properties: Object.fromEntries(keys.map((k) => [k, { type: 'string' }])),
  required: keys,
});
const stringOutput = (key) => ({
  type: 'object',
  properties: { [key]: { type: 'string' } },
  required: [key],
});
const numberOutput = (key) => ({
  type: 'object',
  properties: { [key]: { type: 'number' } },
  required: [key],
});

function makeTools() {
  return [
    new Tool({
      name: 'to_upper',
      description: 'Uppercase a string. Returns { result }.',
      inputSchema: stringInput('text'),
      outputSchema: stringOutput('result'),
      handler: async ({ text }) => ({ result: text.toUpperCase() }),
    }),
    new Tool({
      name: 'reverse_text',
      description: 'Reverse a string. Returns { result }.',
      inputSchema: stringInput('text'),
      outputSchema: stringOutput('result'),
      handler: async ({ text }) => ({ result: [...text].reverse().join('') }),
    }),
    new Tool({
      name: 'concat',
      description: 'Concatenate two strings. Returns { result }.',
      inputSchema: stringInput('a', 'b'),
      outputSchema: stringOutput('result'),
      handler: async ({ a, b }) => ({ result: a + b }),
    }),
    new Tool({
      name: 'wrap',
      description: 'Wrap text with a prefix and suffix. Returns { result }.',
      inputSchema: stringInput('text', 'prefix', 'suffix'),
      outputSchema: stringOutput('result'),
      handler: async ({ text, prefix, suffix }) => ({ result: prefix + text + suffix }),
    }),
    new Tool({
      name: 'count_chars',
      description: 'Count characters in a string. Returns { count }.',
      inputSchema: stringInput('text'),
      outputSchema: numberOutput('count'),
      handler: async ({ text }) => ({ count: text.length }),
    }),
  ];
}

// ---------------------------------------------------------------------------
// Scripted "LLM" provider. Each step is a function that receives the live
// message history so it can read prior tool results — same pattern a real
// LLM uses, just deterministic.
// ---------------------------------------------------------------------------

class ScriptedLLM extends Provider {
  constructor(steps) {
    super();
    this.steps = steps;
  }
  async chat({ messages }) {
    if (this.steps.length === 0) throw new Error('ScriptedLLM script exhausted');
    const next = this.steps.shift()(messages);
    const toolCalls = next.toolCalls ?? [];
    return {
      content: next.content ?? '',
      toolCalls,
      assistantMessage: {
        role: 'assistant',
        content: next.content ?? '',
        ...(toolCalls.length > 0 && {
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.args) },
          })),
        }),
      },
    };
  }
}

const findToolResult = (messages, callId) => {
  const m = messages.find((x) => x.role === 'tool' && x.tool_call_id === callId);
  if (!m) throw new Error(`No tool result found for ${callId}`);
  return JSON.parse(m.content);
};

const callToolStep = (id, name, args) => ({ toolCalls: [{ id, name, args }] });
const finalStep = (text) => ({ content: text });

function getAssistantToolCalls(messages) {
  return messages
    .filter((m) => m.role === 'assistant' && Array.isArray(m.tool_calls))
    .flatMap((m) =>
      m.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      })),
    );
}

// ---------------------------------------------------------------------------
// Loop mechanics: scripted LLM chains 5 tools, each consuming the previous
// tool's output. Verifies tool wiring, history threading, and final result.
// ---------------------------------------------------------------------------

test('agent loop: scripted LLM chains 5 tools, each using the prior result', async () => {
  const INPUT = 'hello';
  const expectedFinalLength = '[OLLEH WORLD]'.length;

  const steps = [
    () => callToolStep('s1', 'to_upper', { text: INPUT }),
    (messages) => {
      const upper = findToolResult(messages, 's1').result;
      return callToolStep('s2', 'reverse_text', { text: upper });
    },
    (messages) => {
      const reversed = findToolResult(messages, 's2').result;
      return callToolStep('s3', 'concat', { a: reversed, b: ' WORLD' });
    },
    (messages) => {
      const joined = findToolResult(messages, 's3').result;
      return callToolStep('s4', 'wrap', { text: joined, prefix: '[', suffix: ']' });
    },
    (messages) => {
      const wrapped = findToolResult(messages, 's4').result;
      return callToolStep('s5', 'count_chars', { text: wrapped });
    },
    (messages) => {
      const count = findToolResult(messages, 's5').count;
      return finalStep(`The final length is ${count}.`);
    },
  ];

  const agent = new Agent({
    provider: new ScriptedLLM(steps),
    systemPrompt: 'sys',
    tools: makeTools(),
    maxIterations: 10,
  });

  const result = await agent.run('process this text');

  // ---------- assertions on the loop itself ----------
  assert.equal(result.iterations, 6, '5 tool steps + 1 final answer step');

  // ---------- tool call sequence and arguments ----------
  const calls = getAssistantToolCalls(result.messages);
  assert.equal(calls.length, 5, 'five tool calls total');

  assert.equal(calls[0].name, 'to_upper');
  assert.deepEqual(calls[0].args, { text: 'hello' });

  // Each subsequent call reads from the prior tool's output.
  assert.equal(calls[1].name, 'reverse_text');
  assert.equal(calls[1].args.text, 'HELLO');

  assert.equal(calls[2].name, 'concat');
  assert.equal(calls[2].args.a, 'OLLEH');
  assert.equal(calls[2].args.b, ' WORLD');

  assert.equal(calls[3].name, 'wrap');
  assert.equal(calls[3].args.text, 'OLLEH WORLD');
  assert.equal(calls[3].args.prefix, '[');
  assert.equal(calls[3].args.suffix, ']');

  assert.equal(calls[4].name, 'count_chars');
  assert.equal(calls[4].args.text, '[OLLEH WORLD]');

  // ---------- final assistant answer ----------
  const match = result.finalMessage.match(/(\d+)/);
  assert.ok(match, `final message should include a number, got: ${result.finalMessage}`);
  assert.equal(Number(match[1]), expectedFinalLength);
});

// ---------------------------------------------------------------------------
// maxIterations safety net — generic, doesn't depend on any specific tool.
// ---------------------------------------------------------------------------

test('agent loop: maxIterations protects against runaway loops', async () => {
  const looping = Array.from({ length: 100 }, (_, i) => () =>
    callToolStep(`c${i}`, 'to_upper', { text: 'x' }),
  );
  const agent = new Agent({
    provider: new ScriptedLLM(looping),
    tools: makeTools(),
    maxIterations: 3,
  });
  await assert.rejects(agent.run('loop'), /maxIterations \(3\)/);
});
