/**
 * Abstract provider contract. Subclasses must implement `chat` to translate
 * canonical messages to/from the wire format of a specific LLM API.
 */
export class Provider {
  /**
   * @param {Object} request
   * @param {import('../types.js').Message[]} request.messages - Canonical history.
   * @param {import('../Tool.js').Tool[]} request.tools
   * @returns {Promise<import('../types.js').ProviderResponse>}
   */
  async chat(_request) {
    throw new Error(`${this.constructor.name} must implement chat({ messages, tools }).`);
  }
}
