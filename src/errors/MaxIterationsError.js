/**
 * Thrown by `Agent.run` when the loop hits the `maxIterations` budget without
 * the model producing a final answer. Carries the full message history so the
 * caller can inspect what happened.
 */
export class MaxIterationsError extends Error {
  /**
   * @param {number} maxIterations
   * @param {import('../types.js').Message[]} messages - Conversation history at the moment of abort.
   */
  constructor(maxIterations, messages) {
    super(`Agent exceeded maxIterations (${maxIterations}) without producing a final answer.`);
    this.name = 'MaxIterationsError';
    this.maxIterations = maxIterations;
    this.messages = messages;
  }
}
