import { validate } from './validate/index.js';
import { ToolError, ValidationError } from './errors/index.js';

const PHASE_LABEL = {
  input: 'Invalid input for tool',
  output: 'Invalid output from tool',
};

function wrapValidate(value, schema, toolName, phase) {
  try {
    validate(value, schema);
  } catch (err) {
    if (err instanceof ValidationError) {
      throw new ToolError(`${PHASE_LABEL[phase]} "${toolName}": ${err.message}`, {
        toolName,
        phase,
        cause: err,
      });
    }
    throw err;
  }
}

async function runHandler(handler, input, toolName) {
  try {
    return await handler(input);
  } catch (err) {
    throw new ToolError(`Tool "${toolName}" handler threw: ${err.message}`, {
      toolName,
      phase: 'handler',
      cause: err,
    });
  }
}

export class Tool {
  constructor({ name, description, inputSchema, outputSchema, handler }) {
    if (!name || typeof name !== 'string') {
      throw new TypeError('Tool requires a string "name".');
    }
    if (typeof handler !== 'function') {
      throw new TypeError(`Tool "${name}" requires a function "handler".`);
    }
    this.name = name;
    this.description = description ?? '';
    this.inputSchema = inputSchema ?? { type: 'object', properties: {} };
    this.outputSchema = outputSchema ?? null;
    this.handler = handler;
  }

  toProviderSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.inputSchema,
    };
  }

  async call(input) {
    wrapValidate(input, this.inputSchema, this.name, 'input');
    const output = await runHandler(this.handler, input, this.name);
    if (this.outputSchema) wrapValidate(output, this.outputSchema, this.name, 'output');
    return output;
  }
}
