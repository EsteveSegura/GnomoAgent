import { ValidationError } from '../errors/index.js';
import { typeOf, labelFor, matchesType } from './utils.js';

export function checkType(value, schema, path) {
  if (!schema.type) return;
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types.some((t) => matchesType(value, t))) return;
  throw new ValidationError(
    `Expected type ${types.join('|')} at "${labelFor(path)}", got ${typeOf(value)}.`,
    { path, value },
  );
}
