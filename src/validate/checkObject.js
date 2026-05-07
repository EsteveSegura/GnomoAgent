import { ValidationError } from '../errors/index.js';
import { typeOf, labelFor } from './utils.js';

export function checkObject(value, schema, path, recurse) {
  if (typeOf(value) !== 'object') return;

  for (const key of schema.required ?? []) {
    if (!(key in value)) {
      throw new ValidationError(
        `Missing required property "${key}" at "${labelFor(path)}".`,
        { path: path ? `${path}.${key}` : key, value },
      );
    }
  }

  if (!schema.properties) return;
  for (const [key, subSchema] of Object.entries(schema.properties)) {
    if (key in value) {
      recurse(value[key], subSchema, path ? `${path}.${key}` : key);
    }
  }
}
