import { ValidationError } from './errors.js';

const typeOf = (v) => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
};

export function validate(value, schema, path = '') {
  if (!schema || typeof schema !== 'object') return;

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    const matches = types.some((t) => {
      if (t === 'integer') return actual === 'number' && Number.isInteger(value);
      return t === actual;
    });
    if (!matches) {
      throw new ValidationError(
        `Expected type ${types.join('|')} at "${path || '<root>'}", got ${actual}.`,
        { path, value },
      );
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    throw new ValidationError(
      `Value at "${path || '<root>'}" must be one of ${JSON.stringify(schema.enum)}.`,
      { path, value },
    );
  }

  if (typeOf(value) === 'object') {
    const required = schema.required || [];
    for (const key of required) {
      if (!(key in value)) {
        throw new ValidationError(
          `Missing required property "${key}" at "${path || '<root>'}".`,
          { path: path ? `${path}.${key}` : key, value },
        );
      }
    }
    if (schema.properties) {
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          validate(value[key], subSchema, path ? `${path}.${key}` : key);
        }
      }
    }
  }

  if (typeOf(value) === 'array' && schema.items) {
    value.forEach((item, i) => validate(item, schema.items, `${path}[${i}]`));
  }
}
