import { Agent, Tool, OpenAIProvider } from '../src/index.js';
import { COLOR, printMessage, printSeparator } from './utils/debug.js';

const numberSchema = { type: 'number' };
const positiveNumberInput = (...keys) => ({
  type: 'object',
  properties: Object.fromEntries(keys.map((k) => [k, numberSchema])),
  required: keys,
});
const numberOutput = (key) => ({
  type: 'object',
  properties: { [key]: numberSchema },
  required: [key],
});

const circleArea = new Tool({
  name: 'circle_area',
  description: 'Compute the area of a circle from its radius. Returns { area }.',
  inputSchema: positiveNumberInput('radius'),
  outputSchema: numberOutput('area'),
  handler: async ({ radius }) => ({ area: Math.PI * radius * radius }),
});

const cylinderLateralArea = new Tool({
  name: 'cylinder_lateral_area',
  description:
    'Compute the lateral (side) surface area of a cylinder from its radius and height. ' +
    'Excludes top and bottom caps. Returns { area }.',
  inputSchema: positiveNumberInput('radius', 'height'),
  outputSchema: numberOutput('area'),
  handler: async ({ radius, height }) => ({ area: 2 * Math.PI * radius * height }),
});

const hemisphereSurface = new Tool({
  name: 'hemisphere_surface',
  description:
    'Compute the curved surface area (the dome) of a hemisphere from its radius. ' +
    'Excludes the flat circular base. Returns { area }.',
  inputSchema: positiveNumberInput('radius'),
  outputSchema: numberOutput('area'),
  handler: async ({ radius }) => ({ area: 2 * Math.PI * radius * radius }),
});

const add = new Tool({
  name: 'add',
  description: 'Return the sum of two numbers. Returns { result }.',
  inputSchema: positiveNumberInput('a', 'b'),
  outputSchema: numberOutput('result'),
  handler: async ({ a, b }) => ({ result: a + b }),
});

const multiply = new Tool({
  name: 'multiply',
  description: 'Return the product of two numbers. Returns { result }.',
  inputSchema: positiveNumberInput('a', 'b'),
  outputSchema: numberOutput('result'),
  handler: async ({ a, b }) => ({ result: a * b }),
});

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Set OPENAI_API_KEY to run this example.');
  process.exit(1);
}

const agent = new Agent({
  provider: new OpenAIProvider({ apiKey, model: 'gpt-4o-mini' }),
  systemPrompt:
    'You are a careful geometry assistant. You MUST use the provided tools for every ' +
    'arithmetic step — do not compute mentally. Decompose the problem, call tools in ' +
    'sequence using prior results, then summarize.',
  tools: [circleArea, cylinderLateralArea, hemisphereSurface, add, multiply],
  maxIterations: 12,
});

const userPrompt =
  'I need to paint the outside of a water tank. The tank is a vertical cylinder ' +
  'with radius 2 m and height 5 m, sitting on a flat circular base, and topped ' +
  'with a hemispherical dome of the same radius. I have to paint the bottom, the ' +
  'cylindrical side, and the dome. Paint costs 8 €/m². What is the total cost? ' +
  'Use the tools step by step.';

printSeparator('USER PROMPT');
console.log(`${COLOR.cyan}${userPrompt}${COLOR.reset}`);

const result = await agent.run(userPrompt, {
  onStep: ({ iteration, content, toolCalls }) => {
    const calls = toolCalls.length
      ? toolCalls.map((c) => `${c.name}(${JSON.stringify(c.args)})`).join(', ')
      : '<final answer>';
    console.log(
      `\n${COLOR.green}[step ${iteration}]${COLOR.reset} ${COLOR.dim}content_len=${content.length} ` +
        `tool_calls=${calls}${COLOR.reset}`,
    );
  },
});

printSeparator('FULL CONVERSATION HISTORY');
result.messages.forEach((m, i) => printMessage(m, i));

printSeparator('FINAL ANSWER');
console.log(`${COLOR.green}${result.finalMessage}${COLOR.reset}`);

const toolInvocations = result.messages.filter((m) => m.role === 'tool').length;
console.log(
  `\n${COLOR.dim}Completed in ${result.iterations} iteration(s). ` +
    `Tool invocations: ${toolInvocations}. Total messages: ${result.messages.length}.${COLOR.reset}`,
);

const expected = 8 * (Math.PI * 4 + 2 * Math.PI * 2 * 5 + 2 * Math.PI * 4);
console.log(`${COLOR.dim}(Reference value computed locally: ${expected.toFixed(2)} €)${COLOR.reset}`);
