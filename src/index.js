/**
 * GnomoAgent — public API surface.
 *
 * @example
 *   import { Agent, Tool, OpenAIProvider } from 'gnomoagent';
 *
 * Type definitions for canonical messages live in {@link ./types.js}.
 */
export { Agent } from './Agent.js';
export { Tool } from './Tool.js';
export { Provider } from './providers/Provider.js';
export { OpenAIProvider } from './providers/OpenAIProvider.js';
export {
  ValidationError,
  ToolError,
  MaxIterationsError,
  ProviderError,
} from './errors/index.js';
export { ROLE, TOOL_TYPE, TOOL_PHASE } from './constants.js';
