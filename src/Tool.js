import { validate } from './validate/index.js';
import { ToolError, ValidationError } from './errors/index.js';
import { TOOL_PHASE } from './constants.js';

const PHASE_LABEL = {
  [TOOL_PHASE.INPUT]: 'Invalid input for tool',
  [TOOL_PHASE.OUTPUT]: 'Invalid output from tool',
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
      phase: TOOL_PHASE.HANDLER,
      cause: err,
    });
  }
}

/**
 * A callable function exposed to the model with declarative input/output JSON Schemas.
 *
 * `inputSchema` is sent to the model so it knows how to call the tool, and
 * is also enforced at runtime before invoking the handler. `outputSchema`,
 * if provided, validates the handler's return value.
 */
export class Tool {
  /**
   * @param {Object} opts
   * @param {string} opts.name - Unique tool name (must match `^[a-zA-Z0-9_-]+$` for OpenAI).
   * @param {string=} opts.description
   * @param {Object=} opts.inputSchema - JSON Schema for the input. Defaults to an empty object schema.
   * @param {Object=} opts.outputSchema - JSON Schema for the output. Optional.
   * @param {(input: any) => Promise<any>|any} opts.handler
   */
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

  /**
   * Returns the function-calling schema (OpenAI/Anthropic shape) describing this tool.
   * @returns {import('./types.js').FunctionSchema}
   */
  toFunctionSchema() {
    return {
      name: this.name,
      description: this.description,
      parameters: this.inputSchema,
    };
  }

  /**
   * Validates input, runs the handler, validates output. All errors are thrown as
   * `ToolError` with a `phase` field ('input' | 'handler' | 'output').
   *
   * @param {any} input
   * @returns {Promise<any>}
   * @throws {ToolError}
   */
  async call(input) {
    wrapValidate(input, this.inputSchema, this.name, TOOL_PHASE.INPUT);
    const output = await runHandler(this.handler, input, this.name);
    if (this.outputSchema) wrapValidate(output, this.outputSchema, this.name, TOOL_PHASE.OUTPUT);
    return output;
  }
}
