import { Agent, Tool, OpenAIProvider } from '../src/index.js';

const weather = new Tool({
  name: 'get_weather',
  description: 'Get the current weather for a city.',
  inputSchema: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name, e.g. "Madrid".' },
    },
    required: ['location'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      temp_celsius: { type: 'number' },
      conditions: { type: 'string' },
    },
    required: ['temp_celsius', 'conditions'],
  },
  handler: async ({ location }) => {
    const fakeDB = {
      Madrid: { temp_celsius: 24, conditions: 'sunny' },
      London: { temp_celsius: 14, conditions: 'cloudy' },
    };
    return fakeDB[location] ?? { temp_celsius: 18, conditions: 'unknown' };
  },
});

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Set OPENAI_API_KEY to run this example.');
  process.exit(1);
}

const agent = new Agent({
  provider: new OpenAIProvider({ apiKey, model: 'gpt-4o-mini' }),
  systemPrompt: 'You are a concise weather assistant. Use tools when needed.',
  tools: [weather],
  maxIterations: 5,
});

const result = await agent.run('What is the weather in Madrid right now?', {
  onStep: ({ iteration, toolCalls }) => {
    const calls = toolCalls.map((c) => `${c.name}(${JSON.stringify(c.args)})`).join(', ');
    console.log(`[step ${iteration}] tool_calls=${calls || '<none>'}`);
  },
});

console.log('\nFinal answer:', result.finalMessage);
console.log(`(${result.iterations} iterations)`);
