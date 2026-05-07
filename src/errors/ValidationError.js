export class ValidationError extends Error {
  constructor(message, { path = '', value } = {}) {
    super(message);
    this.name = 'ValidationError';
    this.path = path;
    this.value = value;
  }
}
