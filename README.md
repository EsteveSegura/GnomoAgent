# GnomoAgent

A tiny JavaScript AI agent framework. Zero dependencies.

## What it does

Wraps an LLM in a reasoning loop with tool calling:

- **System prompt** + **tools** with JSON Schema for input/output.
- **Pluggable providers** — ships with `OpenAIProvider`; add others by extending `Provider`.
- **Reasoning loop** that exits when the model stops calling tools (or hits `maxIterations`).
- Runtime input/output validation; tool errors are fed back to the model so it can recover.

## Usage

```js
import { Agent, Tool, OpenAIProvider } from './src/index.js';

const weather = new Tool({
  name: 'get_weather',
  description: 'Get the current weather for a city.',
  inputSchema: {
    type: 'object',
    properties: { location: { type: 'string' } },
    required: ['location'],
  },
  outputSchema: {
    type: 'object',
    properties: { temp_celsius: { type: 'number' }, conditions: { type: 'string' } },
    required: ['temp_celsius', 'conditions'],
  },
  handler: async ({ location }) => ({ temp_celsius: 24, conditions: 'sunny' }),
});

const agent = new Agent({
  provider: new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' }),
  systemPrompt: 'You are a concise assistant.',
  tools: [weather],
  maxIterations: 5,
});

const { finalMessage } = await agent.run('Weather in Madrid?');
console.log(finalMessage);
```

## Run the example

```sh
OPENAI_API_KEY=sk-... npm run example
```

Requires Node 18+ (uses native `fetch`).
