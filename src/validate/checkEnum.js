import { ValidationError } from '../errors/index.js';
import { labelFor } from './utils.js';

export function checkEnum(value, schema, path) {
  if (!schema.enum) return;
  if (schema.enum.includes(value)) return;
  throw new ValidationError(
    `Value at "${labelFor(path)}" must be one of ${JSON.stringify(schema.enum)}.`,
    { path, value },
  );
}
