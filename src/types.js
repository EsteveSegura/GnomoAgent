/**
 * Canonical message shapes used by the Agent and Provider contract.
 * Providers translate these to/from their wire format at the boundary.
 *
 * @typedef {Object} ToolCall
 * @property {string} id - Unique identifier the model assigned to this call.
 * @property {string} name - Tool name to invoke.
 * @property {Object} args - Already JSON-parsed arguments.
 *
 * @typedef {Object} SystemMessage
 * @property {'system'} role
 * @property {string}   content
 *
 * @typedef {Object} UserMessage
 * @property {'user'}   role
 * @property {string}   content
 *
 * @typedef {Object} AssistantMessage
 * @property {'assistant'} role
 * @property {string}      content
 * @property {ToolCall[]=} toolCalls
 *
 * @typedef {Object} ToolMessage
 * @property {'tool'}  role
 * @property {string}  toolCallId - Matches the assistant's tool call id.
 * @property {string=} name
 * @property {string}  content - Stringified result payload.
 *
 * @typedef {SystemMessage | UserMessage | AssistantMessage | ToolMessage} Message
 *
 * @typedef {Object} ProviderResponse
 * @property {string}     content    - Free-text the model emitted.
 * @property {ToolCall[]} toolCalls  - Empty array when the model did not call tools.
 * @property {*=}         raw        - Provider-specific raw payload (debugging).
 *
 * @typedef {Object} OnStepEvent
 * @property {number}     iteration
 * @property {string}     content
 * @property {ToolCall[]} toolCalls
 *
 * @typedef {Object} AgentRunResult
 * @property {string}    finalMessage - Last assistant content (loop exit).
 * @property {Message[]} messages     - Full conversation history.
 * @property {number}    iterations   - How many provider chats were made.
 *
 * @typedef {Object} FunctionSchema
 * @property {string} name
 * @property {string} description
 * @property {Object} parameters - JSON Schema for the tool's input.
 */

export {};
