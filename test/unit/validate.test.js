import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../../src/validate/index.js';
import { ValidationError } from '../../src/errors/index.js';

test('validate: passes when types match', () => {
  validate({ name: 'a', age: 3 }, {
    type: 'object',
    properties: { name: { type: 'string' }, age: { type: 'number' } },
    required: ['name'],
  });
});

test('validate: throws on wrong primitive type', () => {
  assert.throws(
    () => validate({ age: '3' }, { type: 'object', properties: { age: { type: 'number' } } }),
    ValidationError,
  );
});

test('validate: throws on missing required property', () => {
  assert.throws(
    () => validate({}, { type: 'object', required: ['x'], properties: { x: { type: 'string' } } }),
    /Missing required property "x"/,
  );
});

test('validate: enum constraint', () => {
  validate('a', { enum: ['a', 'b'] });
  assert.throws(() => validate('c', { enum: ['a', 'b'] }), ValidationError);
});

test('validate: array items recursive', () => {
  validate([1, 2, 3], { type: 'array', items: { type: 'number' } });
  assert.throws(
    () => validate([1, 'x'], { type: 'array', items: { type: 'number' } }),
    /\[1\]/,
  );
});

test('validate: integer type rejects floats', () => {
  validate(3, { type: 'integer' });
  assert.throws(() => validate(3.5, { type: 'integer' }), ValidationError);
});

test('validate: null is its own type, not object', () => {
  assert.throws(() => validate(null, { type: 'object' }), ValidationError);
});

test('validate: unknown schema keywords are ignored', () => {
  validate({ a: 1 }, { type: 'object', additionalProperties: false, weirdKey: 42 });
});
