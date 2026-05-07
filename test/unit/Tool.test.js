import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Tool } from '../../src/Tool.js';
import { ToolError } from '../../src/errors/index.js';

const addSchema = {
  input: {
    type: 'object',
    properties: { a: { type: 'number' }, b: { type: 'number' } },
    required: ['a', 'b'],
  },
  output: { type: 'object', properties: { sum: { type: 'number' } }, required: ['sum'] },
};

test('Tool: requires name and handler', () => {
  assert.throws(() => new Tool({ handler: () => {} }), TypeError);
  assert.throws(() => new Tool({ name: 'x' }), TypeError);
});

test('Tool: toProviderSchema shape', () => {
  const t = new Tool({
    name: 'add',
    description: 'add',
    inputSchema: addSchema.input,
    handler: async ({ a, b }) => ({ sum: a + b }),
  });
  assert.deepEqual(t.toProviderSchema(), {
    name: 'add',
    description: 'add',
    parameters: addSchema.input,
  });
});

test('Tool.call: validates input and returns output', async () => {
  const t = new Tool({
    name: 'add',
    inputSchema: addSchema.input,
    outputSchema: addSchema.output,
    handler: async ({ a, b }) => ({ sum: a + b }),
  });
  assert.deepEqual(await t.call({ a: 2, b: 3 }), { sum: 5 });
});

test('Tool.call: bad input throws ToolError with phase=input', async () => {
  const t = new Tool({
    name: 'add',
    inputSchema: addSchema.input,
    handler: async () => ({ sum: 0 }),
  });
  await assert.rejects(t.call({ a: 'x', b: 3 }), (err) => {
    return err instanceof ToolError && err.phase === 'input' && err.toolName === 'add';
  });
});

test('Tool.call: bad output throws ToolError with phase=output', async () => {
  const t = new Tool({
    name: 'add',
    inputSchema: addSchema.input,
    outputSchema: addSchema.output,
    handler: async () => ({ sum: 'not a number' }),
  });
  await assert.rejects(t.call({ a: 1, b: 2 }), (err) => {
    return err instanceof ToolError && err.phase === 'output';
  });
});

test('Tool.call: handler throw is wrapped', async () => {
  const t = new Tool({
    name: 'boom',
    inputSchema: { type: 'object' },
    handler: async () => {
      throw new Error('kaboom');
    },
  });
  await assert.rejects(t.call({}), (err) => {
    return err instanceof ToolError && err.phase === 'handler' && /kaboom/.test(err.message);
  });
});

test('Tool: outputSchema is optional', async () => {
  const t = new Tool({
    name: 'free',
    inputSchema: { type: 'object' },
    handler: async () => 'anything goes',
  });
  assert.equal(await t.call({}), 'anything goes');
});
