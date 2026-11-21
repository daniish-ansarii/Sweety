const test = require('node:test');
const assert = require('node:assert/strict');
const { localDate, previousMonthRange, validateReading } = require('./validation');
const now = new Date('2026-12-31T19:00:00.000Z');
const reading = overrides => ({ date: '2026-12-31', slot: 'morning', value: 100, ...overrides });

test('reading validation requires a whole number in the allowed range', () => {
  assert.equal(validateReading(reading({ value: '' }), 'UTC', now), 'Please enter a glucose value.');
  assert.equal(validateReading(reading({ value: 39 }), 'UTC', now), 'Value must be between 40 and 600 mg/dl.');
  assert.equal(validateReading(reading({ value: 600 }), 'UTC', now), null);
  assert.equal(validateReading(reading({ value: 100.5 }), 'UTC', now), 'Value must be between 40 and 600 mg/dl.');
});

test('reading validation rejects unknown slots and impossible dates', () => {
  assert.equal(validateReading(reading({ slot: 'midnight' }), 'UTC', now), 'Please choose a valid time slot.');
  assert.equal(validateReading(reading({ date: '2026-02-30' }), 'UTC', now), 'Please choose a valid date.');
});

test('the future-date check uses the browser timezone', () => {
  assert.equal(localDate('Asia/Kolkata', now), '2027-01-01');
  assert.equal(validateReading(reading({ date: '2027-01-01' }), 'Asia/Kolkata', now), null);
  assert.equal(validateReading(reading({ date: '2027-01-01' }), 'UTC', now), 'Date cannot be in the future.');
});

test('previous-month ranges include the entire previous calendar month', () => {
  assert.deepEqual(previousMonthRange('2026-11-21'), { start: '2026-10-01', end: '2026-10-31' });
  assert.deepEqual(previousMonthRange('2026-03-15'), { start: '2026-02-01', end: '2026-02-28' });
  assert.deepEqual(previousMonthRange('2024-03-15'), { start: '2024-02-01', end: '2024-02-29' });
});
