export class Provider {
  // eslint-disable-next-line no-unused-vars
  async chat({ messages, tools }) {
    throw new Error(`${this.constructor.name} must implement chat({ messages, tools }).`);
  }
}
