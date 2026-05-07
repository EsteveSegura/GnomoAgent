import { checkType } from './checkType.js';
import { checkEnum } from './checkEnum.js';
import { checkObject } from './checkObject.js';
import { checkArray } from './checkArray.js';

export function validate(value, schema, path = '') {
  if (!schema || typeof schema !== 'object') return;
  checkType(value, schema, path);
  checkEnum(value, schema, path);
  checkObject(value, schema, path, validate);
  checkArray(value, schema, path, validate);
}
