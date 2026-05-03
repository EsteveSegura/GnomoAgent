import { validate } from './validate.js';
import { ToolError, ValidationError } from './errors.js';

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
    try {
      validate(input, this.inputSchema);
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new ToolError(`Invalid input for tool "${this.name}": ${err.message}`, {
          toolName: this.name,
          phase: 'input',
          cause: err,
        });
      }
      throw err;
    }

    let output;
    try {
      output = await this.handler(input);
    } catch (err) {
      throw new ToolError(`Tool "${this.name}" handler threw: ${err.message}`, {
        toolName: this.name,
        phase: 'handler',
        cause: err,
      });
    }

    if (this.outputSchema) {
      try {
        validate(output, this.outputSchema);
      } catch (err) {
        if (err instanceof ValidationError) {
          throw new ToolError(`Invalid output from tool "${this.name}": ${err.message}`, {
            toolName: this.name,
            phase: 'output',
            cause: err,
          });
        }
        throw err;
      }
    }

    return output;
  }
}
