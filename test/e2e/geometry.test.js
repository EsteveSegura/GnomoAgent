import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Agent, Tool, OpenAIProvider } from '../../src/index.js';

// ---------------------------------------------------------------------------
// Geometry tools — same shape as in examples/geometry.js. Owned by the test
// so the suite isn't coupled to the example file.
// ---------------------------------------------------------------------------

const numberSchema = { type: 'number' };
const numberInput = (...keys) => ({
  type: 'object',
  properties: Object.fromEntries(keys.map((k) => [k, numberSchema])),
  required: keys,
});
const numberOutput = (key) => ({
  type: 'object',
  properties: { [key]: numberSchema },
  required: [key],
});

function makeTools() {
  return [
    new Tool({
      name: 'circle_area',
      description: 'Area of a circle from radius. Returns { area }.',
      inputSchema: numberInput('radius'),
      outputSchema: numberOutput('area'),
      handler: async ({ radius }) => ({ area: Math.PI * radius * radius }),
    }),
    new Tool({
      name: 'cylinder_lateral_area',
      description: 'Lateral area of a cylinder. Returns { area }.',
      inputSchema: numberInput('radius', 'height'),
      outputSchema: numberOutput('area'),
      handler: async ({ radius, height }) => ({ area: 2 * Math.PI * radius * height }),
    }),
    new Tool({
      name: 'hemisphere_surface',
      description: 'Curved surface of a hemisphere. Returns { area }.',
      inputSchema: numberInput('radius'),
      outputSchema: numberOutput('area'),
      handler: async ({ radius }) => ({ area: 2 * Math.PI * radius * radius }),
    }),
    new Tool({
      name: 'add',
      description: 'Sum two numbers. Returns { result }.',
      inputSchema: numberInput('a', 'b'),
      outputSchema: numberOutput('result'),
      handler: async ({ a, b }) => ({ result: a + b }),
    }),
    new Tool({
      name: 'multiply',
      description: 'Product of two numbers. Returns { result }.',
      inputSchema: numberInput('a', 'b'),
      outputSchema: numberOutput('result'),
      handler: async ({ a, b }) => ({ result: a * b }),
    }),
  ];
}

function getAssistantToolCalls(messages) {
  return messages
    .filter((m) => m.role === 'assistant' && Array.isArray(m.toolCalls))
    .flatMap((m) => m.toolCalls.map((tc) => ({ id: tc.id, name: tc.name, args: tc.args })));
}

// ---------------------------------------------------------------------------
// Live e2e against real OpenAI. Skipped unless OPENAI_API_KEY is set so the
// suite stays deterministic in CI.
// Run with: OPENAI_API_KEY=sk-... npm run test:e2e
// ---------------------------------------------------------------------------

const liveOpts = process.env.OPENAI_API_KEY ? {} : { skip: 'set OPENAI_API_KEY to enable' };

test('e2e geometry [live]: real OpenAI computes the paint cost', liveOpts, async () => {
  const RADIUS = 2;
  const HEIGHT = 5;
  const PRICE = 8;
  const expectedCost =
    PRICE *
    (Math.PI * RADIUS ** 2 + 2 * Math.PI * RADIUS * HEIGHT + 2 * Math.PI * RADIUS ** 2);

  const agent = new Agent({
    provider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    }),
    systemPrompt:
      'You are a careful geometry assistant. You MUST use the provided tools for ' +
      'every arithmetic step — do not compute mentally. After producing the final ' +
      'numeric cost, respond with a sentence that contains the cost followed by " €".',
    tools: makeTools(),
    maxIterations: 12,
  });

  const result = await agent.run(
    `Paint a vertical cylindrical water tank with a flat circular base and a hemispherical dome. ` +
      `Radius ${RADIUS} m, cylinder height ${HEIGHT} m. Surfaces to paint: base, cylindrical side, ` +
      `dome. Paint costs ${PRICE} €/m². Compute the total cost using the tools.`,
  );

  const calls = getAssistantToolCalls(result.messages);
  assert.ok(calls.length >= 4, `expected at least 4 tool calls, got ${calls.length}`);

  const names = new Set(calls.map((c) => c.name));
  for (const required of ['circle_area', 'cylinder_lateral_area', 'hemisphere_surface']) {
    assert.ok(
      names.has(required),
      `model should call ${required}, called: ${[...names].join(', ')}`,
    );
  }

  const numbers = (result.finalMessage.match(/[\d]+(?:\.[\d]+)?/g) ?? []).map(Number);
  const close = numbers.find((n) => Math.abs(n - expectedCost) < 1.0);
  assert.ok(
    close !== undefined,
    `expected a number near ${expectedCost.toFixed(2)} in final answer, got: ${result.finalMessage}`,
  );
});
