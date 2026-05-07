export const typeOf = (v) => {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
};

export const labelFor = (path) => path || '<root>';

export const matchesType = (value, type) => {
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  return typeOf(value) === type;
};
