export class MaxIterationsError extends Error {
  constructor(maxIterations, messages) {
    super(`Agent exceeded maxIterations (${maxIterations}) without producing a final answer.`);
    this.name = 'MaxIterationsError';
    this.maxIterations = maxIterations;
    this.messages = messages;
  }
}
