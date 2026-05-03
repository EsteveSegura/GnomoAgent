import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Agent } from '../src/Agent.js';
import { Tool } from '../src/Tool.js';
import { Provider } from '../src/providers/Provider.js';
import { MaxIterationsError } from '../src/errors.js';

class ScriptedProvider extends Provider {
  constructor(steps) {
    super();
    this.steps = steps;
    this.calls = [];
  }
  async chat({ messages, tools }) {
    this.calls.push({ messages: structuredClone(messages), tools });
    const step = this.steps.shift();
    if (!step) throw new Error('Provider script exhausted');
    const toolCalls = step.toolCalls ?? [];
    return {
      content: step.content ?? '',
      toolCalls,
      assistantMessage: {
        role: 'assistant',
        content: step.content ?? '',
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

const addTool = () =>
  new Tool({
    name: 'add',
    inputSchema: {
      type: 'object',
      properties: { a: { type: 'number' }, b: { type: 'number' } },
      required: ['a', 'b'],
    },
    outputSchema: { type: 'object', properties: { sum: { type: 'number' } }, required: ['sum'] },
    handler: async ({ a, b }) => ({ sum: a + b }),
  });

test('Agent: constructor requires provider', () => {
  assert.throws(() => new Agent({}), TypeError);
});

test('Agent: returns immediately when no tool calls', async () => {
  const provider = new ScriptedProvider([{ content: 'hello' }]);
  const agent = new Agent({ provider, systemPrompt: 'sys' });
  const r = await agent.run('hi');
  assert.equal(r.finalMessage, 'hello');
  assert.equal(r.iterations, 1);
  assert.equal(r.messages[0].role, 'system');
  assert.equal(r.messages[1].role, 'user');
  assert.equal(r.messages.at(-1).role, 'assistant');
});

test('Agent: runs tool then finalizes', async () => {
  const provider = new ScriptedProvider([
    { toolCalls: [{ id: 'c1', name: 'add', args: { a: 2, b: 3 } }] },
    { content: 'sum is 5' },
  ]);
  const agent = new Agent({ provider, tools: [addTool()] });
  const r = await agent.run('2+3?');
  assert.equal(r.iterations, 2);
  assert.equal(r.finalMessage, 'sum is 5');
  const toolMsg = r.messages.find((m) => m.role === 'tool');
  assert.equal(toolMsg.tool_call_id, 'c1');
  assert.deepEqual(JSON.parse(toolMsg.content), { sum: 5 });
});

test('Agent: skips system message when systemPrompt is empty', async () => {
  const provider = new ScriptedProvider([{ content: 'ok' }]);
  const agent = new Agent({ provider });
  const r = await agent.run('hi');
  assert.equal(r.messages[0].role, 'user');
});

test('Agent: feeds tool validation errors back to the model instead of throwing', async () => {
  const provider = new ScriptedProvider([
    { toolCalls: [{ id: 'c1', name: 'add', args: { a: 'nope', b: 3 } }] },
    { content: 'sorry' },
  ]);
  const agent = new Agent({ provider, tools: [addTool()] });
  const r = await agent.run('go');
  const toolMsg = r.messages.find((m) => m.role === 'tool');
  const parsed = JSON.parse(toolMsg.content);
  assert.match(parsed.error, /Invalid input for tool "add"/);
});

test('Agent: unknown tool name returns error to model', async () => {
  const provider = new ScriptedProvider([
    { toolCalls: [{ id: 'c1', name: 'nope', args: {} }] },
    { content: 'fixed' },
  ]);
  const agent = new Agent({ provider, tools: [addTool()] });
  const r = await agent.run('go');
  const toolMsg = r.messages.find((m) => m.role === 'tool');
  assert.match(JSON.parse(toolMsg.content).error, /Unknown tool: nope/);
});

test('Agent: throws MaxIterationsError when budget is exhausted', async () => {
  const looping = Array.from({ length: 5 }, (_, i) => ({
    toolCalls: [{ id: `c${i}`, name: 'add', args: { a: 1, b: 1 } }],
  }));
  const provider = new ScriptedProvider(looping);
  const agent = new Agent({ provider, tools: [addTool()], maxIterations: 2 });
  await assert.rejects(agent.run('x'), MaxIterationsError);
});

test('Agent: onStep callback fires per iteration', async () => {
  const provider = new ScriptedProvider([
    { toolCalls: [{ id: 'c1', name: 'add', args: { a: 1, b: 2 } }] },
    { content: 'done' },
  ]);
  const seen = [];
  const agent = new Agent({ provider, tools: [addTool()] });
  await agent.run('go', { onStep: (s) => seen.push(s.iteration) });
  assert.deepEqual(seen, [1, 2]);
});

test('Agent: parallel tool calls in one step are all executed', async () => {
  const provider = new ScriptedProvider([
    {
      toolCalls: [
        { id: 'a', name: 'add', args: { a: 1, b: 1 } },
        { id: 'b', name: 'add', args: { a: 10, b: 5 } },
      ],
    },
    { content: 'both done' },
  ]);
  const agent = new Agent({ provider, tools: [addTool()] });
  const r = await agent.run('go');
  const toolMsgs = r.messages.filter((m) => m.role === 'tool');
  assert.equal(toolMsgs.length, 2);
  assert.deepEqual(JSON.parse(toolMsgs[0].content), { sum: 2 });
  assert.deepEqual(JSON.parse(toolMsgs[1].content), { sum: 15 });
});
