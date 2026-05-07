import { typeOf } from './utils.js';

export function checkArray(value, schema, path, recurse) {
  if (typeOf(value) !== 'array' || !schema.items) return;
  value.forEach((item, i) => recurse(item, schema.items, `${path}[${i}]`));
}
