import { Agent, Tool, OpenAIProvider } from '../src/index.js';
import { COLOR, printMessage, printSeparator } from './utils/debug.js';

const getWeather = new Tool({
  name: 'get_weather',
  description: 'Get the current weather for a city.',
  inputSchema: {
    type: 'object',
    properties: { location: { type: 'string', description: 'City name.' } },
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
      Tokyo: { temp_celsius: 19, conditions: 'rainy' },
      'New York': { temp_celsius: 11, conditions: 'windy' },
    };
    return fakeDB[location] ?? { temp_celsius: 18, conditions: 'unknown' };
  },
});

const recommendActivity = new Tool({
  name: 'recommend_activity',
  description: 'Recommend an outdoor activity based on the weather conditions.',
  inputSchema: {
    type: 'object',
    properties: {
      conditions: { type: 'string' },
      temp_celsius: { type: 'number' },
    },
    required: ['conditions', 'temp_celsius'],
  },
  outputSchema: {
    type: 'object',
    properties: { activity: { type: 'string' } },
    required: ['activity'],
  },
  handler: async ({ conditions, temp_celsius }) => {
    if (conditions === 'sunny' && temp_celsius >= 20) return { activity: 'go for a picnic' };
    if (conditions === 'rainy') return { activity: 'visit a museum' };
    if (conditions === 'windy') return { activity: 'fly a kite' };
    if (temp_celsius < 15) return { activity: 'grab a hot coffee' };
    return { activity: 'take a walk' };
  },
});

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('Set OPENAI_API_KEY to run this example.');
  process.exit(1);
}

const agent = new Agent({
  provider: new OpenAIProvider({ apiKey, model: 'gpt-4o-mini' }),
  systemPrompt:
    'You are a travel assistant. Use the available tools to look up weather and ' +
    'recommend an activity. Always end with a short friendly summary for the user.',
  tools: [getWeather, recommendActivity],
  maxIterations: 8,
});

const userPrompt =
  'I am visiting Madrid and Tokyo this week. What is the weather like in each, ' +
  'and what should I do there?';

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
console.log(
  `\n${COLOR.dim}Completed in ${result.iterations} iteration(s). ` +
    `Total messages: ${result.messages.length}.${COLOR.reset}`,
);
