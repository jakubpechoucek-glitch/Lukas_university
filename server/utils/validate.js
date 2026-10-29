// Jednoduchá validace vstupů. Chyby se vyhazují jako { status, message } stejně jako v services.

function fail(message) {
  throw { status: 422, message };
}

function optionalInt(value, name, { min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(`${name}: očekáváno celé číslo ${min}–${max}`);
  return n;
}

function optionalNumber(value, name, { min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) fail(`${name}: očekáváno číslo ${min}–${max}`);
  return n;
}

function requiredText(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name}: povinné pole`);
  return value.trim();
}

function optionalText(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s ? s : null;
}

function oneOf(value, name, allowed, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!allowed.includes(value)) fail(`${name}: povolené hodnoty ${allowed.join(', ')}`);
  return value;
}

const grade = (value, name = 'známka') => optionalInt(value, name, { min: 1, max: 7 });

module.exports = { fail, optionalInt, optionalNumber, requiredText, optionalText, oneOf, grade };
